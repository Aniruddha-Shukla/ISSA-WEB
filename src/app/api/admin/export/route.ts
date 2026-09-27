import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const querySchema = z.object({
  dataset: z.enum(["members", "registrations", "attendance", "quiz_leaderboard", "quiz_responses", "submissions"]),
  format: z.enum(["csv", "json"]).default("csv"),
  event_id: z.guid().optional(),
  quiz_id: z.guid().optional(),
});

type Row = Record<string, unknown>;
type Person = {
  full_name: string | null;
  email: string;
  roll_no: string | null;
  branch: string | null;
  year: number | null;
} | null;

const person = (p: Person) => ({
  name: p?.full_name ?? "",
  email: p?.email ?? "",
  roll_no: p?.roll_no ?? "",
  branch: p?.branch ?? "",
  year: p?.year ?? "",
});

/**
 * Admin data export. Runs with the admin's own session, so every query is
 * still filtered by RLS — a non-admin gets 403 here and empty sets from the DB.
 */
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (profile.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid export parameters" }, { status: 400 });
  const { dataset, format, event_id, quiz_id } = parsed.data;

  const supabase = await createSupabaseServerClient();
  let rows: Row[] = [];
  let label: string = dataset;

  switch (dataset) {
    case "members": {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, roll_no, branch, year, role, github_url, linkedin_url, created_at")
        .order("created_at");
      if (error) return Response.json({ error: error.message }, { status: 500 });
      rows = data ?? [];
      break;
    }
    case "registrations":
    case "attendance": {
      let query = supabase
        .from("registrations")
        .select(
          "ticket_code, status, team_name, registered_at, checked_in_at, events(title, starts_at), attendee:profiles!registrations_user_id_fkey(full_name, email, roll_no, branch, year)",
        )
        .order("registered_at");
      if (event_id) query = query.eq("event_id", event_id);
      if (dataset === "attendance") query = query.eq("status", "attended");
      const { data, error } = await query;
      if (error) return Response.json({ error: error.message }, { status: 500 });
      rows = (data ?? []).map((r) => {
        const event = r.events as unknown as { title: string; starts_at: string } | null;
        return {
          event: event?.title ?? "",
          event_date: event?.starts_at ?? "",
          ...person(r.attendee as unknown as Person),
          ticket_code: r.ticket_code,
          status: r.status,
          team_name: r.team_name,
          registered_at: r.registered_at,
          checked_in_at: r.checked_in_at,
        };
      });
      break;
    }
    case "quiz_leaderboard": {
      if (!quiz_id) return Response.json({ error: "quiz_id is required" }, { status: 400 });
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select(
          "display_name, score, correct_count, answered_count, total_time_ms, started_at, finished_at, profiles(full_name, email, roll_no, branch, year)",
        )
        .eq("quiz_id", quiz_id)
        .order("score", { ascending: false })
        .order("correct_count", { ascending: false })
        .order("total_time_ms", { ascending: true });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      let rank = 0;
      let prevKey = "";
      rows = (data ?? []).map((a, index) => {
        const key = `${a.score}|${a.correct_count}|${a.total_time_ms}`;
        if (key !== prevKey) rank = index + 1;
        prevKey = key;
        return {
          rank,
          display_name: a.display_name,
          ...person(a.profiles as unknown as Person),
          score: a.score,
          correct: a.correct_count,
          answered: a.answered_count,
          total_time_seconds: Number(a.total_time_ms) / 1000,
          started_at: a.started_at,
          finished_at: a.finished_at,
        };
      });
      label = `quiz-leaderboard`;
      break;
    }
    case "quiz_responses": {
      if (!quiz_id) return Response.json({ error: "quiz_id is required" }, { status: 400 });
      const { data, error } = await supabase
        .from("quiz_responses")
        .select(
          "selected_index, is_correct, points_awarded, response_ms, answered_at, quiz_questions!inner(position, prompt, quiz_id), quiz_attempts!inner(display_name, profiles(email, roll_no))",
        )
        .eq("quiz_questions.quiz_id", quiz_id)
        .order("answered_at");
      if (error) return Response.json({ error: error.message }, { status: 500 });
      rows = (data ?? []).map((r) => {
        const q = r.quiz_questions as unknown as { position: number; prompt: string };
        const a = r.quiz_attempts as unknown as {
          display_name: string;
          profiles: { email: string; roll_no: string | null } | null;
        };
        return {
          question: q.position + 1,
          prompt: q.prompt,
          player: a.display_name,
          email: a.profiles?.email ?? "",
          roll_no: a.profiles?.roll_no ?? "",
          selected_option: r.selected_index === null ? "" : String.fromCharCode(65 + Number(r.selected_index)),
          correct: r.is_correct,
          points: r.points_awarded,
          response_seconds: Number(r.response_ms) / 1000,
          answered_at: r.answered_at,
        };
      });
      break;
    }
    case "submissions": {
      let query = supabase
        .from("submissions")
        .select(
          "title, team_name, description, repo_url, demo_url, file_path, status, score, feedback, submitted_at, updated_at, events(title), profiles(full_name, email, roll_no, branch, year)",
        )
        .order("submitted_at");
      if (event_id) query = query.eq("event_id", event_id);
      const { data, error } = await query;
      if (error) return Response.json({ error: error.message }, { status: 500 });
      rows = (data ?? []).map((s) => ({
        event: (s.events as unknown as { title: string } | null)?.title ?? "",
        ...person(s.profiles as unknown as Person),
        title: s.title,
        team_name: s.team_name,
        repo_url: s.repo_url,
        demo_url: s.demo_url,
        file_path: s.file_path,
        status: s.status,
        score: s.score,
        feedback: s.feedback,
        description: s.description,
        submitted_at: s.submitted_at,
        updated_at: s.updated_at,
      }));
      break;
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `issa-${label}${event_id ? `-${event_id.slice(0, 8)}` : ""}${quiz_id ? `-${quiz_id.slice(0, 8)}` : ""}-${stamp}.${format}`;
  const headers = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };

  if (format === "json") {
    return new Response(JSON.stringify({ dataset, exported_at: new Date().toISOString(), count: rows.length, rows }, null, 2), {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    });
  }
  return new Response(toCsv(rows), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
}
