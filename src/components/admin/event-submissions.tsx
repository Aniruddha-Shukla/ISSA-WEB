"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, FileDown, Save } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Submission, SubmissionStatus } from "@/lib/types";
import { errorMessage, formatDateTime, isSafeHttpUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { submissionStatusTone } from "@/components/events/status";

type Row = Submission & { profiles: { full_name: string | null; email: string; roll_no: string | null } | null };
const statuses: SubmissionStatus[] = ["submitted", "under_review", "accepted", "rejected", "winner"];

function ReviewCard({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<SubmissionStatus>(row.status);
  const [score, setScore] = useState(row.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(row.feedback ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await getSupabaseBrowserClient()
      .from("submissions")
      .update({ status, score: score === "" ? null : Number(score), feedback: feedback.trim() || null })
      .eq("id", row.id);
    setSaving(false);
    if (error) toast.error("Couldn't save review", errorMessage(error));
    else {
      toast.success("Review saved");
      onSaved();
    }
  }

  async function downloadFile() {
    if (!row.file_path) return;
    const { data, error } = await getSupabaseBrowserClient()
      .storage.from("submissions")
      .createSignedUrl(row.file_path, 60, { download: true });
    if (error || !data) {
      toast.error("Couldn't create download link", errorMessage(error));
      return;
    }
    window.location.href = data.signedUrl;
  }

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-ink">{row.title}</p>
          <p className="text-sm text-muted">
            {row.team_name ? `Team ${row.team_name} · ` : ""}
            {row.profiles?.full_name ?? row.profiles?.email} {row.profiles?.roll_no ? `(${row.profiles.roll_no})` : ""}
          </p>
          <p className="mt-1 text-xs text-faint">Updated {formatDateTime(row.updated_at)}</p>
        </div>
        <Badge tone={submissionStatusTone[row.status]}>{row.status.replace("_", " ")}</Badge>
      </div>
      {row.description ? <p className="mt-3 text-sm whitespace-pre-line text-muted">{row.description}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {isSafeHttpUrl(row.repo_url) ? (
          <a
            href={row.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <ExternalLink className="size-4" aria-hidden /> Repository
          </a>
        ) : null}
        {isSafeHttpUrl(row.demo_url) ? (
          <a
            href={row.demo_url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <ExternalLink className="size-4" aria-hidden /> Demo
          </a>
        ) : null}
        {row.file_path ? (
          <Button variant="secondary" size="sm" onClick={() => void downloadFile()}>
            <FileDown className="size-4" aria-hidden /> Attached file
          </Button>
        ) : null}
      </div>
      <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-[10rem_7rem_1fr_auto] sm:items-end">
        <Field label="Status" htmlFor={`st-${row.id}`}>
          <Select id={`st-${row.id}`} value={status} onChange={(e) => setStatus(e.target.value as SubmissionStatus)}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Score" htmlFor={`sc-${row.id}`}>
          <Input
            id={`sc-${row.id}`}
            type="number"
            step="0.5"
            min={0}
            max={1000}
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </Field>
        <Field label="Feedback (visible to the team)" htmlFor={`fb-${row.id}`}>
          <Textarea
            id={`fb-${row.id}`}
            rows={1}
            className="min-h-11"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </Field>
        <Button onClick={() => void save()} loading={saving}>
          <Save className="size-4" aria-hidden /> Save
        </Button>
      </div>
    </li>
  );
}

export function EventSubmissions({ eventId }: { eventId: string }) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabaseBrowserClient()
      .from("submissions")
      .select("*, profiles(full_name, email, roll_no)")
      .eq("event_id", eventId)
      .order("submitted_at", { ascending: true });
    if (error) toast.error("Couldn't load submissions", error.message);
    else setRows((data as Row[]) ?? []);
  }, [eventId, toast]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    void run();
  }, [load]);

  if (rows === null) return <Skeleton className="h-48 w-full" />;

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <a
          href={`/api/admin/export?dataset=submissions&format=csv&event_id=${eventId}`}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          <Download className="size-4" aria-hidden /> Submissions CSV
        </a>
        <a
          href={`/api/admin/export?dataset=submissions&format=json&event_id=${eventId}`}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          JSON
        </a>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No submissions yet" description="Submissions appear here as teams submit from the event page." />
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <ReviewCard key={`${row.id}-${row.updated_at}`} row={row} onSaved={() => void load()} />
          ))}
        </ul>
      )}
    </div>
  );
}
