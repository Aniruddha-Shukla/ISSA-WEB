"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FileUp, Paperclip, Send, Timer } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ClubEvent, Registration, Submission } from "@/lib/types";
import { errorMessage, formatDateTime } from "@/lib/utils";
import { formatCountdown, useNow } from "@/lib/use-now";
import { Badge } from "@/components/ui/badge";
import { submissionStatusTone } from "./status";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/feedback";

// Keep uploads small: the Supabase free tier has 1 GB of storage in total.
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".zip,.pdf,.pptx,.png,.jpg,.jpeg,.txt";

export function SubmissionPortal({ event }: { event: ClubEvent }) {
  const { configured, loading: authLoading, user } = useAuth();
  const toast = useToast();
  const now = useNow();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", team_name: "", description: "", repo_url: "", demo_url: "" });

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const [reg, sub] = await Promise.all([
      supabase.from("registrations").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
      supabase.from("submissions").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
    ]);
    setRegistration((reg.data as Registration | null) ?? null);
    const existing = (sub.data as Submission | null) ?? null;
    setSubmission(existing);
    if (existing) {
      setForm({
        title: existing.title,
        team_name: existing.team_name ?? "",
        description: existing.description ?? "",
        repo_url: existing.repo_url ?? "",
        demo_url: existing.demo_url ?? "",
      });
    } else if (reg.data?.team_name) {
      setForm((f) => ({ ...f, team_name: reg.data.team_name }));
    }
    setLoaded(true);
  }, [event.id, user]);

  useEffect(() => {
    if (!configured || authLoading || !user) return;
    const run = async () => {
      await load();
    };
    void run();
  }, [configured, authLoading, user, load]);

  if (!configured) {
    return (
      <Notice tone="warning" title="Submissions are offline in demo mode">
        Connect Supabase to accept project submissions.
      </Notice>
    );
  }
  if (authLoading || (user && !loaded) || now === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const deadline = event.submission_deadline ? Date.parse(event.submission_deadline) : null;
  const closed = deadline !== null && now > deadline;
  const registered = registration && registration.status !== "cancelled";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (file && file.size > MAX_BYTES) {
      toast.error("File too large", "The limit is 10 MB. Link a repository or drive folder instead.");
      return;
    }
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    try {
      let filePath: string | null = null;
      if (file) {
        const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
        filePath = `${event.id}/${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("submissions").upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });
        if (uploadError) throw uploadError;
      }
      const { data, error } = await supabase.rpc("upsert_submission", {
        p_event_id: event.id,
        p_title: form.title,
        p_description: form.description || null,
        p_repo_url: form.repo_url || null,
        p_demo_url: form.demo_url || null,
        p_file_path: filePath,
        p_team_name: form.team_name || null,
      });
      if (error) throw error;
      setSubmission(data as Submission);
      setFile(null);
      toast.success(submission ? "Submission updated" : "Submission received", "You can keep editing until the deadline.");
    } catch (error) {
      toast.error("Submission failed", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="submit-title" className="card p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.68rem] tracking-[0.2em] text-accent uppercase">Submission portal</p>
          <h2 id="submit-title" className="mt-1.5 text-xl font-semibold text-ink">
            Submit your project
          </h2>
        </div>
        {deadline ? (
          <p className={closed ? "text-sm text-danger" : "flex items-center gap-1.5 text-sm text-muted"}>
            {closed ? (
              <>Closed {formatDateTime(new Date(deadline))}</>
            ) : (
              <>
                <Timer className="size-4 text-warning" aria-hidden /> Closes in{" "}
                <span className="font-mono text-ink">{formatCountdown(deadline - now)}</span>
              </>
            )}
          </p>
        ) : null}
      </div>

      {event.submission_guidelines ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{event.submission_guidelines}</p>
      ) : null}

      {submission ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
          <Badge tone={submissionStatusTone[submission.status]}>{submission.status.replace("_", " ")}</Badge>
          <span className="text-muted">Last updated {formatDateTime(submission.updated_at)}</span>
          {submission.score != null ? <span className="text-ink">Score: {submission.score}</span> : null}
          {submission.file_path ? (
            <span className="flex items-center gap-1 text-faint">
              <Paperclip className="size-3.5" aria-hidden /> file attached
            </span>
          ) : null}
          {submission.feedback ? <p className="w-full text-muted">Feedback: {submission.feedback}</p> : null}
        </div>
      ) : null}

      {!user ? (
        <Notice className="mt-5" title="Sign in and register to submit" />
      ) : !registered ? (
        <Notice className="mt-5" tone="warning" title="Register for this event first">
          Only registered participants can submit. Use the registration panel on this page.
        </Notice>
      ) : closed ? null : (
        <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Project title" htmlFor="sub-title" required className="sm:col-span-2">
            <Input
              id="sub-title"
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="Team name" htmlFor="sub-team" hint="Submit once per team.">
            <Input
              id="sub-team"
              maxLength={80}
              value={form.team_name}
              onChange={(e) => setForm({ ...form, team_name: e.target.value })}
            />
          </Field>
          <Field label="Repository URL" htmlFor="sub-repo" hint="GitHub, GitLab…">
            <Input
              id="sub-repo"
              type="url"
              inputMode="url"
              placeholder="https://github.com/…"
              value={form.repo_url}
              onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
            />
          </Field>
          <Field label="Demo link" htmlFor="sub-demo" hint="Deployed app or video (optional)" className="sm:col-span-2">
            <Input
              id="sub-demo"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={form.demo_url}
              onChange={(e) => setForm({ ...form, demo_url: e.target.value })}
            />
          </Field>
          <Field label="Description" htmlFor="sub-desc" hint="What does it do? How is it secure?" className="sm:col-span-2">
            <Textarea
              id="sub-desc"
              rows={5}
              maxLength={5000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <label
              htmlFor="sub-file"
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line-strong px-4 py-4 text-sm text-muted transition-colors focus-within:border-primary/60 hover:border-primary/40 hover:text-ink"
            >
              <FileUp className="size-5 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {file
                  ? file.name
                  : submission?.file_path
                    ? "Replace attached file (optional)"
                    : "Attach a file (optional) — .zip, .pdf, .pptx, images · max 10 MB"}
              </span>
              <input
                id="sub-file"
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="lg" loading={busy}>
              <Send className="size-4" aria-hidden /> {submission ? "Update submission" : "Submit project"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
