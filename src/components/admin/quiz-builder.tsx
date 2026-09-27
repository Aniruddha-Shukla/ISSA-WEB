"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  ExternalLink,
  FileUp,
  Flag,
  MonitorPlay,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash,
  Undo2,
  X,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Quiz } from "@/lib/types";
import { cn, errorMessage, isoToLocalInput, localInputToIso } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { quizStatusTone } from "./quizzes-admin";

type Draft = {
  key: string;
  id?: string;
  prompt: string;
  options: string[];
  correct_index: number;
  time_limit: number;
  points: number;
  image_url: string;
  explanation: string;
};

type QuestionRow = {
  id: string;
  prompt: string;
  options: string[];
  time_limit: number;
  points: number;
  image_url: string | null;
  explanation: string | null;
  quiz_answer_keys: { correct_index: number } | { correct_index: number }[] | null;
};

const LETTERS = "ABCDEF";
const TIME_LIMITS = [10, 15, 20, 30, 45, 60, 90, 120];
const POINTS = [0, 500, 1000, 1500, 2000];
const newKey = () => Math.random().toString(36).slice(2, 10);
const blank = (): Draft => ({
  key: newKey(),
  prompt: "",
  options: ["", "", "", ""],
  correct_index: 0,
  time_limit: 20,
  points: 1000,
  image_url: "",
  explanation: "",
});

function validate(questions: Draft[]) {
  for (const [i, q] of questions.entries()) {
    if (!q.prompt.trim()) return `Question ${i + 1} needs a prompt.`;
    const filled = q.options.map((o) => o.trim());
    if (filled.length < 2) return `Question ${i + 1} needs at least two options.`;
    if (filled.some((o) => !o)) return `Question ${i + 1} has an empty option — fill it in or remove it.`;
    if (q.correct_index < 0 || q.correct_index >= filled.length) return `Question ${i + 1} needs a correct answer.`;
  }
  return null;
}

export function QuizBuilder({ quizId }: { quizId: string }) {
  const toast = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Draft[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [players, setPlayers] = useState(0);
  const [settings, setSettings] = useState({
    title: "",
    description: "",
    mode: "live",
    event_id: "",
    opens_at: "",
    closes_at: "",
    members_only: false,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [confirm, setConfirm] = useState<"reset" | "end" | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const [quizRes, questionsRes, eventsRes, attemptsRes] = await Promise.all([
      supabase.from("quizzes").select("*").eq("id", quizId).single(),
      supabase.from("quiz_questions").select("*, quiz_answer_keys(correct_index)").eq("quiz_id", quizId).order("position"),
      supabase.from("events").select("id, title").order("starts_at", { ascending: false }).limit(60),
      supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("quiz_id", quizId),
    ]);
    if (quizRes.error || !quizRes.data) {
      toast.error("Couldn't load quiz", errorMessage(quizRes.error));
      return;
    }
    const q = quizRes.data as Quiz;
    setQuiz(q);
    setSettings({
      title: q.title,
      description: q.description ?? "",
      mode: q.mode,
      event_id: q.event_id ?? "",
      opens_at: isoToLocalInput(q.opens_at),
      closes_at: isoToLocalInput(q.closes_at),
      members_only: q.members_only,
    });
    setQuestions(
      ((questionsRes.data as QuestionRow[]) ?? []).map((row) => {
        const key = Array.isArray(row.quiz_answer_keys) ? row.quiz_answer_keys[0] : row.quiz_answer_keys;
        return {
          key: row.id,
          id: row.id,
          prompt: row.prompt,
          options: row.options,
          correct_index: key?.correct_index ?? 0,
          time_limit: row.time_limit,
          points: row.points,
          image_url: row.image_url ?? "",
          explanation: row.explanation ?? "",
        };
      }),
    );
    setEvents((eventsRes.data as { id: string; title: string }[]) ?? []);
    setPlayers(attemptsRes.count ?? 0);
    setDirty(false);
  }, [quizId, toast]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    void run();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const locked = players > 0;
  const totalTime = useMemo(() => questions.reduce((s, q) => s + q.time_limit, 0), [questions]);

  const update = (key: string, patch: Partial<Draft>) => {
    setQuestions((all) => all.map((q) => (q.key === key ? { ...q, ...patch } : q)));
    setDirty(true);
  };
  const move = (index: number, delta: number) => {
    setQuestions((all) => {
      const next = [...all];
      const target = index + delta;
      if (target < 0 || target >= next.length) return all;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };

  async function saveAll() {
    const problem = validate(questions);
    if (problem) {
      toast.error("Fix the questions first", problem);
      return;
    }
    if (settings.mode === "self_paced" && settings.opens_at && settings.closes_at && settings.closes_at <= settings.opens_at) {
      toast.error("Check the quiz window", "The closing time must be after the opening time.");
      return;
    }
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    const { error: settingsError } = await supabase
      .from("quizzes")
      .update({
        title: settings.title.trim(),
        description: settings.description.trim() || null,
        mode: settings.mode,
        event_id: settings.event_id || null,
        opens_at: settings.mode === "self_paced" ? localInputToIso(settings.opens_at) : null,
        closes_at: settings.mode === "self_paced" ? localInputToIso(settings.closes_at) : null,
        members_only: settings.members_only,
      })
      .eq("id", quizId);
    if (settingsError) {
      setSaving(false);
      toast.error("Couldn't save settings", errorMessage(settingsError));
      return;
    }
    if (!locked) {
      const { error } = await supabase.rpc("save_quiz_questions", {
        p_quiz_id: quizId,
        p_questions: questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          options: q.options.map((o) => o.trim()),
          correct_index: q.correct_index,
          time_limit: q.time_limit,
          points: q.points,
          image_url: q.image_url,
          explanation: q.explanation,
        })),
      });
      if (error) {
        setSaving(false);
        toast.error("Couldn't save questions", errorMessage(error));
        return;
      }
    }
    setSaving(false);
    toast.success("Quiz saved");
    await load();
  }

  async function act(action: "publish" | "unpublish" | "end" | "reset") {
    if (dirty && action === "publish") await saveAll();
    setActing(action);
    const { error } = await getSupabaseBrowserClient().rpc("host_quiz_action", { p_quiz_id: quizId, p_action: action });
    setActing(null);
    setConfirm(null);
    if (error) {
      toast.error("Action failed", errorMessage(error));
      return;
    }
    toast.success(
      action === "publish"
        ? "Quiz published"
        : action === "unpublish"
          ? "Moved back to draft"
          : action === "end"
            ? "Quiz ended — badges awarded"
            : "Quiz reset",
    );
    await load();
  }

  function importJson() {
    try {
      const parsed = JSON.parse(importText) as unknown;
      const list = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown[] }).questions;
      if (!Array.isArray(list)) throw new Error("Expected an array of questions.");
      const drafts: Draft[] = list.map((raw) => {
        const q = raw as Partial<Draft> & { answer?: number };
        return {
          ...blank(),
          prompt: String(q.prompt ?? ""),
          options: Array.isArray(q.options) ? q.options.map(String).slice(0, 6) : ["", ""],
          correct_index: Number(q.correct_index ?? q.answer ?? 0),
          time_limit: TIME_LIMITS.includes(Number(q.time_limit)) ? Number(q.time_limit) : 20,
          points: Number(q.points ?? 1000),
          explanation: String(q.explanation ?? ""),
          image_url: String(q.image_url ?? ""),
        };
      });
      setQuestions((all) => [...all, ...drafts]);
      setDirty(true);
      setImportOpen(false);
      setImportText("");
      toast.success(`Imported ${drafts.length} questions`, "Review them, then save.");
    } catch (error) {
      toast.error("Import failed", errorMessage(error));
    }
  }

  function exportJson() {
    const data = questions.map(({ prompt, options, correct_index, time_limit, points, explanation, image_url }) => ({
      prompt,
      options,
      correct_index,
      time_limit,
      points,
      explanation: explanation || undefined,
      image_url: image_url || undefined,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${settings.title.replace(/\W+/g, "-").toLowerCase() || "quiz"}-questions.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!quiz) return <Skeleton className="h-96 w-full" />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={quizStatusTone[quiz.status]}>{quiz.status}</Badge>
            <Badge tone="neutral">{quiz.mode === "live" ? "live · hosted" : "self-paced"}</Badge>
            {dirty ? <Badge tone="warning">unsaved changes</Badge> : null}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{settings.title || "Untitled quiz"}</h1>
          <p className="mt-1 text-sm text-muted">
            {questions.length} questions · ~{Math.ceil(totalTime / 60)} min of answering time · {players} players
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void saveAll()} loading={saving} disabled={!dirty && !saving}>
            <Save className="size-4" aria-hidden /> Save
          </Button>
          {quiz.status === "draft" ? (
            <Button variant="secondary" onClick={() => void act("publish")} loading={acting === "publish"}>
              <Send className="size-4" aria-hidden /> Publish
            </Button>
          ) : (
            <>
              {quiz.mode === "live" && quiz.status === "published" ? (
                <Link href={`/admin/quizzes/${quizId}/host`} className={buttonClasses({ variant: "secondary" })}>
                  <MonitorPlay className="size-4" aria-hidden /> Host console
                </Link>
              ) : null}
              {quiz.status === "published" ? (
                <Button variant="secondary" onClick={() => setConfirm("end")}>
                  <Flag className="size-4" aria-hidden /> End quiz
                </Button>
              ) : null}
              <Link href={`/quizzes/${quizId}`} target="_blank" className={buttonClasses({ variant: "ghost" })}>
                <ExternalLink className="size-4" aria-hidden /> Player view
              </Link>
            </>
          )}
          {players > 0 ? (
            <Button variant="danger" onClick={() => setConfirm("reset")}>
              <RotateCcw className="size-4" aria-hidden /> Reset
            </Button>
          ) : quiz.status === "published" ? (
            <Button variant="ghost" onClick={() => void act("unpublish")} loading={acting === "unpublish"}>
              <Undo2 className="size-4" aria-hidden /> Unpublish
            </Button>
          ) : null}
        </div>
      </div>

      {locked ? (
        <Notice tone="warning" className="mb-6" title="Questions are locked">
          {players} {players === 1 ? "person has" : "people have"} played this quiz, so questions can&apos;t change without
          breaking scores. Settings can still be edited. Reset the quiz to clear all attempts and unlock editing.
        </Notice>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {questions.map((q, index) => (
            <fieldset key={q.key} disabled={locked} className="card p-5 disabled:opacity-80">
              <legend className="sr-only">Question {index + 1}</legend>
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-semibold text-primary">Q{index + 1}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move question ${index + 1} up`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => move(index, 1)}
                    disabled={index === questions.length - 1}
                    aria-label={`Move question ${index + 1} down`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setQuestions((all) => [
                        ...all.slice(0, index + 1),
                        { ...q, key: newKey(), id: undefined },
                        ...all.slice(index + 1),
                      ]);
                      setDirty(true);
                    }}
                    aria-label={`Duplicate question ${index + 1}`}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:text-danger"
                    onClick={() => {
                      setQuestions((all) => all.filter((x) => x.key !== q.key));
                      setDirty(true);
                    }}
                    aria-label={`Delete question ${index + 1}`}
                  >
                    <Trash className="size-4" />
                  </Button>
                </div>
              </div>

              <Field label="Question" htmlFor={`p-${q.key}`} required>
                <Textarea
                  id={`p-${q.key}`}
                  rows={2}
                  maxLength={1000}
                  value={q.prompt}
                  onChange={(e) => update(q.key, { prompt: e.target.value })}
                />
              </Field>

              <div
                className="mt-4 space-y-2"
                role="radiogroup"
                aria-label={`Options for question ${index + 1}; select the correct answer`}
              >
                {q.options.map((option, oi) => (
                  <div
                    key={oi}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-1.5 pl-3",
                      q.correct_index === oi ? "border-success/50 bg-success/[0.06]" : "border-line",
                    )}
                  >
                    <input
                      type="radio"
                      name={`correct-${q.key}`}
                      checked={q.correct_index === oi}
                      onChange={() => update(q.key, { correct_index: oi })}
                      className="size-4 accent-[var(--color-success)]"
                      aria-label={`Mark option ${LETTERS[oi]} as the correct answer`}
                    />
                    <span className="w-4 font-mono text-xs text-faint">{LETTERS[oi]}</span>
                    <Input
                      aria-label={`Option ${LETTERS[oi]}`}
                      value={option}
                      maxLength={200}
                      onChange={(e) => update(q.key, { options: q.options.map((o, i) => (i === oi ? e.target.value : o)) })}
                      className="h-9 border-transparent bg-transparent"
                    />
                    {q.options.length > 2 ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove option ${LETTERS[oi]}`}
                        onClick={() =>
                          update(q.key, {
                            options: q.options.filter((_, i) => i !== oi),
                            correct_index:
                              q.correct_index === oi ? 0 : q.correct_index > oi ? q.correct_index - 1 : q.correct_index,
                          })
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {q.options.length < 6 ? (
                  <Button variant="ghost" size="sm" onClick={() => update(q.key, { options: [...q.options, ""] })}>
                    <Plus className="size-4" aria-hidden /> Add option
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Time limit" htmlFor={`t-${q.key}`}>
                  <Select
                    id={`t-${q.key}`}
                    value={q.time_limit}
                    onChange={(e) => update(q.key, { time_limit: Number(e.target.value) })}
                  >
                    {TIME_LIMITS.map((t) => (
                      <option key={t} value={t}>
                        {t} seconds
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Points" htmlFor={`pt-${q.key}`}>
                  <Select id={`pt-${q.key}`} value={q.points} onChange={(e) => update(q.key, { points: Number(e.target.value) })}>
                    {(POINTS.includes(q.points) ? POINTS : [...POINTS, q.points]).map((p) => (
                      <option key={p} value={p}>
                        {p === 0 ? "No points" : `${p} (×${p / 1000})`}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Image URL" htmlFor={`img-${q.key}`}>
                  <Input
                    id={`img-${q.key}`}
                    type="url"
                    placeholder="optional"
                    value={q.image_url}
                    onChange={(e) => update(q.key, { image_url: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Explanation" htmlFor={`ex-${q.key}`} hint="Shown after the answer is revealed." className="mt-4">
                <Input
                  id={`ex-${q.key}`}
                  maxLength={500}
                  value={q.explanation}
                  onChange={(e) => update(q.key, { explanation: e.target.value })}
                />
              </Field>
            </fieldset>
          ))}

          {!locked ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setQuestions((all) => [...all, blank()]);
                  setDirty(true);
                }}
              >
                <Plus className="size-4" aria-hidden /> Add question
              </Button>
              <Button variant="ghost" onClick={() => setImportOpen(true)}>
                <FileUp className="size-4" aria-hidden /> Import JSON
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="space-y-4 card p-5" aria-labelledby="quiz-settings">
            <h2 id="quiz-settings" className="font-semibold text-ink">
              Settings
            </h2>
            <Field label="Title" htmlFor="qs-title" required>
              <Input
                id="qs-title"
                value={settings.title}
                onChange={(e) => {
                  setSettings({ ...settings, title: e.target.value });
                  setDirty(true);
                }}
              />
            </Field>
            <Field label="Description" htmlFor="qs-desc">
              <Textarea
                id="qs-desc"
                rows={3}
                value={settings.description}
                onChange={(e) => {
                  setSettings({ ...settings, description: e.target.value });
                  setDirty(true);
                }}
              />
            </Field>
            <Field label="Format" htmlFor="qs-mode" hint={locked ? "Locked while the quiz has players." : undefined}>
              <Select
                id="qs-mode"
                value={settings.mode}
                disabled={locked}
                onChange={(e) => {
                  setSettings({ ...settings, mode: e.target.value });
                  setDirty(true);
                }}
              >
                <option value="live">Live (hosted)</option>
                <option value="self_paced">Self-paced</option>
              </Select>
            </Field>
            {settings.mode === "self_paced" ? (
              <>
                <Field label="Opens" htmlFor="qs-open" hint="Blank = as soon as it's published">
                  <Input
                    id="qs-open"
                    type="datetime-local"
                    value={settings.opens_at}
                    onChange={(e) => {
                      setSettings({ ...settings, opens_at: e.target.value });
                      setDirty(true);
                    }}
                  />
                </Field>
                <Field label="Closes" htmlFor="qs-close" hint="Blank = open until you end it">
                  <Input
                    id="qs-close"
                    type="datetime-local"
                    value={settings.closes_at}
                    onChange={(e) => {
                      setSettings({ ...settings, closes_at: e.target.value });
                      setDirty(true);
                    }}
                  />
                </Field>
              </>
            ) : null}
            <Field label="Linked event" htmlFor="qs-event">
              <Select
                id="qs-event"
                value={settings.event_id}
                onChange={(e) => {
                  setSettings({ ...settings, event_id: e.target.value });
                  setDirty(true);
                }}
              >
                <option value="">None</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Switch
              id="qs-members"
              label="Members only"
              description="Guests can watch but not play."
              checked={settings.members_only}
              onChange={(v) => {
                setSettings({ ...settings, members_only: v });
                setDirty(true);
              }}
            />
          </section>

          <section className="space-y-2 card p-5" aria-labelledby="quiz-data">
            <h2 id="quiz-data" className="mb-2 font-semibold text-ink">
              Data
            </h2>
            <a
              href={`/api/admin/export?dataset=quiz_leaderboard&format=csv&quiz_id=${quizId}`}
              className={buttonClasses({ variant: "secondary", size: "sm", className: "w-full" })}
            >
              <Download className="size-4" aria-hidden /> Leaderboard CSV
            </a>
            <a
              href={`/api/admin/export?dataset=quiz_responses&format=csv&quiz_id=${quizId}`}
              className={buttonClasses({ variant: "secondary", size: "sm", className: "w-full" })}
            >
              <Download className="size-4" aria-hidden /> All responses CSV
            </a>
            <Button variant="ghost" size="sm" className="w-full" onClick={exportJson}>
              <Download className="size-4" aria-hidden /> Questions JSON
            </Button>
          </section>
        </aside>
      </div>

      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import questions"
        description="Paste a JSON array. Imported questions are appended."
        size="lg"
      >
        <Textarea
          aria-label="Questions JSON"
          rows={12}
          className="font-mono text-xs"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={`[\n  { "prompt": "Which port does SSH use?", "options": ["21", "22", "80", "443"], "correct_index": 1, "time_limit": 20 }\n]`}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setImportOpen(false)}>
            Cancel
          </Button>
          <Button onClick={importJson} disabled={!importText.trim()}>
            Import
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "reset" ? "Reset this quiz?" : "End this quiz?"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm === "reset" ? "danger" : "primary"}
              loading={acting !== null}
              onClick={() => confirm && void act(confirm)}
            >
              {confirm === "reset" ? "Delete attempts & reset" : "End quiz"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {confirm === "reset"
            ? "All attempts, answers and scores are permanently deleted and the quiz returns to its lobby. Use this after a rehearsal."
            : "Answers close for everyone, final standings are locked, podium badges are awarded and answer reviews unlock."}
        </p>
      </Dialog>
    </div>
  );
}
