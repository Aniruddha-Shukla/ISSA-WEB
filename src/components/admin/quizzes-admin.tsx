"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MonitorPlay, Pencil, Plus, Trophy } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Quiz } from "@/lib/types";
import { errorMessage, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/feedback";

type Row = Pick<Quiz, "id" | "title" | "mode" | "status" | "phase" | "created_at"> & {
  question_count: number;
  participant_count: number;
};

export const quizStatusTone = { draft: "warning", published: "primary", ended: "neutral" } as const;

export function QuizzesAdmin() {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"live" | "self_paced">("live");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await getSupabaseBrowserClient().rpc("admin_quiz_list");
    if (error) toast.error("Couldn't load quizzes", error.message);
    else setRows((data as Row[]) ?? []);
  }, [toast]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    void run();
  }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    const { data, error } = await getSupabaseBrowserClient()
      .from("quizzes")
      .insert({ title: title.trim(), mode })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) {
      toast.error("Couldn't create quiz", errorMessage(error));
      return;
    }
    router.push(`/admin/quizzes/${data.id}`);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden /> New quiz
        </Button>
      </div>

      {rows === null ? (
        <Skeleton className="h-48 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-5" />}
          title="No quizzes yet"
          description="Create a live quiz for your next event or a self-paced practice quiz."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-surface-2 font-mono text-xs tracking-wider text-faint uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Quiz
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Mode
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Questions
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Players
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {rows.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{q.title}</p>
                    <p className="text-xs text-faint">created {formatDate(q.created_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{q.mode === "live" ? "Live (hosted)" : "Self-paced"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={quizStatusTone[q.status]}>
                      {q.status === "published" && q.mode === "live" ? `live · ${q.phase}` : q.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted">{q.question_count}</td>
                  <td className="px-4 py-3 font-mono text-muted">{q.participant_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {q.mode === "live" && q.status !== "draft" ? (
                        <Link href={`/admin/quizzes/${q.id}/host`} className={buttonClasses({ size: "sm" })}>
                          <MonitorPlay className="size-4" aria-hidden /> Host
                        </Link>
                      ) : null}
                      <Link href={`/admin/quizzes/${q.id}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                        <Pencil className="size-4" aria-hidden /> Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New quiz"
        description="You'll add questions on the next screen."
        size="sm"
      >
        <form onSubmit={create} className="space-y-5">
          <Field label="Title" htmlFor="nq-title" required>
            <Input
              id="nq-title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cyber Quiz Night"
            />
          </Field>
          <Field
            label="Format"
            htmlFor="nq-mode"
            hint={
              mode === "live"
                ? "You control the pace from the host console; everyone answers the same question at once."
                : "Players take it any time within an optional window; each question has its own timer."
            }
          >
            <Select id="nq-mode" value={mode} onChange={(e) => setMode(e.target.value as "live" | "self_paced")}>
              <option value="live">Live — hosted on a big screen</option>
              <option value="self_paced">Self-paced — play any time</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} disabled={!title.trim()}>
              Create & add questions
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
