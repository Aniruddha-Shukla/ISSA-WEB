"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CircleCheck, CircleX, Fish, Flag, Mail, Paperclip, RotateCcw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import {
  CLUE_POINTS,
  FALSE_FLAG_PENALTY,
  maxScore,
  phishingEmails,
  VERDICT_POINTS,
  type PhishingEmail,
} from "@/content/phishing";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn, errorMessage } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { badgeNames } from "./play-meta";

type Result = { id: string; correct: boolean; found: number; clues: number; falseFlags: number; points: number };
type Answer = { verdict: boolean } & Result;

const shuffle = <T,>(items: T[]) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function grade(pct: number) {
  if (pct >= 0.9) return { title: "Phish Spotter", text: "Scammers would hate to email you. Teach your friends!" };
  if (pct >= 0.7) return { title: "Sharp-eyed analyst", text: "You catch most tricks. Review the red flags you missed." };
  if (pct >= 0.45) return { title: "Getting there", text: "Slow down and inspect senders and links before deciding." };
  return { title: "Phish food", text: "No shame, that's why we practise. Play again and use the hints below each email." };
}

/** Numbers the links in reading order: "link-0", "link-1", … (the ids clue targets use). */
function numberLinks(body: PhishingEmail["body"]) {
  let n = 0;
  return body.map((paragraph) =>
    paragraph.map((segment) => (typeof segment === "string" ? segment : { ...segment, id: `link-${n++}` })),
  );
}

/** A clickable part of the email that can be flagged as suspicious. */
function Target({
  id,
  flagged,
  answered,
  isClue,
  onToggle,
  onPeek,
  className,
  children,
}: {
  id: string;
  flagged: boolean;
  answered: boolean;
  isClue: boolean;
  onToggle: (id: string) => void;
  onPeek?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const state = !answered
    ? flagged
      ? "border-danger/70 bg-danger/10 text-ink"
      : "border-dashed border-white/25 hover:border-primary/60 hover:bg-primary/5"
    : isClue
      ? flagged
        ? "border-success/70 bg-success/10"
        : "border-warning/70 bg-warning/10"
      : flagged
        ? "border-danger/70 bg-danger/10 line-through decoration-danger/70"
        : "border-transparent";
  return (
    <button
      type="button"
      disabled={answered}
      aria-pressed={flagged}
      onClick={() => {
        onPeek?.();
        onToggle(id);
      }}
      onMouseEnter={onPeek}
      onFocus={onPeek}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-left transition-colors disabled:cursor-default",
        state,
        className,
      )}
    >
      {children}
      {flagged ? <Flag className="size-3 shrink-0 text-danger" aria-label="flagged" /> : null}
    </button>
  );
}

function EmailView({
  email,
  flagged,
  answer,
  onToggle,
}: {
  email: PhishingEmail;
  flagged: Set<string>;
  answer: Answer | null;
  onToggle: (id: string) => void;
}) {
  const [peek, setPeek] = useState<string | null>(null);
  const clueTargets = new Set(email.clues.map((c) => c.target));
  const target = (id: string) => ({
    id,
    flagged: flagged.has(id),
    answered: Boolean(answer),
    isClue: clueTargets.has(id),
    onToggle,
  });
  const paragraphs = numberLinks(email.body);

  return (
    <div className="overflow-hidden rounded-2xl border border-line-strong bg-[#0d1117]">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-ink">{email.subject}</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <dt className="w-16 shrink-0 text-faint">From</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <Avatar name={email.from.name} size={24} />
              <span className="text-ink">{email.from.name}</span>
              <Target {...target("from")} onPeek={() => setPeek(`Sender address: ${email.from.address}`)}>
                <span className="font-mono text-xs">&lt;{email.from.address}&gt;</span>
              </Target>
            </dd>
          </div>
          {email.replyTo ? (
            <div className="flex flex-wrap items-center gap-2">
              <dt className="w-16 shrink-0 text-faint">Reply-To</dt>
              <dd>
                <Target {...target("replyTo")} onPeek={() => setPeek(`Replies go to: ${email.replyTo}`)}>
                  <span className="font-mono text-xs">{email.replyTo}</span>
                </Target>
              </dd>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <dt className="w-16 shrink-0 text-faint">To</dt>
            <dd className="font-mono text-xs text-muted">you@nie.ac.in · {email.time}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3 px-5 py-5 leading-relaxed text-ink/90 sm:px-6">
        {paragraphs.map((paragraph, p) => (
          <p key={p} className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {paragraph.map((segment, s) => {
              if (typeof segment === "string") return <span key={s}>{segment}</span>;
              return (
                <Target
                  key={s}
                  {...target(segment.id)}
                  onPeek={() => setPeek(segment.href)}
                  className="text-primary underline underline-offset-4"
                >
                  {segment.link}
                </Target>
              );
            })}
          </p>
        ))}
        {email.attachments?.length ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {email.attachments.map((a, i) => (
              <Target key={a.name} {...target(`attachment-${i}`)} onPeek={() => setPeek(`Attachment: ${a.name}`)}>
                <Paperclip className="size-3.5 text-faint" aria-hidden />
                <span className="font-mono text-xs">{a.name}</span>
                <span className="text-xs text-faint">{a.size}</span>
              </Target>
            ))}
          </div>
        ) : null}
      </div>

      {/* like a browser's status bar: where a link would really take you */}
      <p className="truncate border-t border-line bg-black/50 px-5 py-2 font-mono text-xs text-faint sm:px-6" aria-live="polite">
        {peek ?? "Hover over (or tap) a link, sender or attachment to inspect it."}
      </p>
    </div>
  );
}

function Feedback({ email, answer, flagged }: { email: PhishingEmail; answer: Answer; flagged: Set<string> }) {
  const clueTargets = new Set(email.clues.map((c) => c.target));
  const falseFlags = [...flagged].filter((t) => !clueTargets.has(t));
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border p-5 sm:p-6",
        answer.correct ? "border-success/40 bg-success/[0.06]" : "border-danger/40 bg-danger/[0.06]",
      )}
    >
      <p className="flex items-center gap-2 font-display text-sm font-bold tracking-[0.12em] uppercase">
        {answer.correct ? (
          <CircleCheck className="size-5 text-success" aria-hidden />
        ) : (
          <CircleX className="size-5 text-danger" aria-hidden />
        )}
        <span className={answer.correct ? "text-success" : "text-danger"}>{answer.correct ? "Correct" : "Not quite"}</span>
        <span className="text-ink">· this one is {email.phish ? "phishing" : "legit"}</span>
        <span className="ml-auto font-mono text-xs text-primary">+{answer.points}</span>
      </p>
      {email.clues.length ? (
        <ul className="mt-4 space-y-2 text-sm">
          {email.clues.map((c) => {
            const found = flagged.has(c.target);
            return (
              <li key={c.target} className="flex gap-2">
                {found ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-label="You flagged this" />
                ) : (
                  <Flag className="mt-0.5 size-4 shrink-0 text-warning" aria-label="Missed red flag" />
                )}
                <span className="text-ink/90">{c.why}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <ul className="mt-3 space-y-1.5 text-sm text-muted">
        {email.notes.map((n) => (
          <li key={n} className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {n}
          </li>
        ))}
        {falseFlags.length ? (
          <li className="flex gap-2 text-danger/90">
            <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />
            You flagged {falseFlags.length} harmless {falseFlags.length === 1 ? "item" : "items"} (−{FALSE_FLAG_PENALTY} each).
          </li>
        ) : null}
      </ul>
    </motion.div>
  );
}

function PhishingLeaderboard({ refreshKey }: { refreshKey: number }) {
  type Row = {
    rank: number;
    display_name: string;
    avatar_url: string | null;
    best_score: number;
    best_total: number;
    is_me: boolean;
  };
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const run = async () => {
      const { data } = await getSupabaseBrowserClient().rpc("phishing_leaderboard", { p_limit: 10 });
      setRows((data as Row[] | null) ?? []);
    };
    void run();
  }, [refreshKey]);
  if (!rows.length) return null;
  return (
    <div className="rounded-3xl p-5 glass sm:p-6">
      <h3 className="font-display text-sm font-bold tracking-[0.2em] text-ink uppercase">Top spotters</h3>
      <ol className="mt-4 space-y-1.5">
        {rows.map((r) => (
          <li
            key={`${r.rank}-${r.display_name}`}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2",
              r.is_me ? "bg-primary/10 ring-1 ring-primary/30" : "bg-white/[0.02]",
            )}
          >
            <span className="w-6 text-center font-display text-sm font-bold text-faint">{r.rank}</span>
            <Avatar name={r.display_name} src={r.avatar_url} size={28} />
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.display_name}</span>
            <span className="font-display text-sm font-bold text-primary">
              {Math.round((r.best_score / r.best_total) * 100)}%
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PhishingGame() {
  const { user } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [order, setOrder] = useState<PhishingEmail[]>(phishingEmails);
  const [index, setIndex] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [saved, setSaved] = useState<{ best: number; total: number; improved: boolean } | null>(null);
  const [boardKey, setBoardKey] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  // bring each new email (and the final score) into view instead of leaving the page scrolled down
  useEffect(() => {
    if (phase === "intro") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    topRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, [phase, index]);

  const email = order[index];
  const total = maxScore(order);
  const score = results.reduce((sum, r) => sum + r.points, 0);

  const start = () => {
    setOrder(shuffle(phishingEmails));
    setIndex(0);
    setFlagged(new Set());
    setAnswer(null);
    setResults([]);
    setSaved(null);
    setPhase("playing");
  };

  const toggle = (id: string) =>
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const decide = (verdict: boolean) => {
    const clueTargets = new Set(email.clues.map((c) => c.target));
    const found = [...flagged].filter((t) => clueTargets.has(t)).length;
    const falseFlags = flagged.size - found;
    const correct = verdict === email.phish;
    const points = Math.max(0, (correct ? VERDICT_POINTS : 0) + found * CLUE_POINTS - falseFlags * FALSE_FLAG_PENALTY);
    const result = { id: email.id, correct, found, clues: email.clues.length, falseFlags, points };
    setAnswer({ verdict, ...result });
    setResults((prev) => [...prev, result]);
  };

  const saveScore = useCallback(
    async (finalScore: number) => {
      if (!user || !isSupabaseConfigured) return;
      const { data, error } = await getSupabaseBrowserClient().rpc("submit_phishing_score", {
        p_score: finalScore,
        p_total: total,
      });
      if (error) {
        toast.error("Couldn't save your score", errorMessage(error));
        return;
      }
      const d = data as { best_score: number; best_total: number; improved: boolean; badge: string | null };
      setSaved({ best: d.best_score, total: d.best_total, improved: d.improved });
      if (d.badge) toast.success("Badge unlocked", badgeNames[d.badge] ?? d.badge);
      setBoardKey((k) => k + 1);
    },
    [user, total, toast],
  );

  const next = () => {
    if (index + 1 >= order.length) {
      setPhase("done");
      void saveScore(score);
      return;
    }
    setIndex(index + 1);
    setFlagged(new Set());
    setAnswer(null);
  };

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="rounded-3xl p-7 glass sm:p-9">
          <Fish className="size-10 text-primary" aria-hidden />
          <h2 className="mt-5 font-display text-2xl font-extrabold tracking-[0.08em] text-ink uppercase">How to play</h2>
          <ol className="mt-5 list-decimal space-y-2.5 pl-5 text-muted">
            <li>You get {phishingEmails.length} emails, one at a time, some real and some phishing.</li>
            <li>
              Inspect each one: hover over (or tap) the sender, links and attachments to see where they really go. Click anything
              suspicious to flag it <Flag className="inline size-3.5 text-danger" aria-hidden />.
            </li>
            <li>
              Decide: <span className="text-ink">phishing</span> or <span className="text-ink">legit</span>. You get{" "}
              {VERDICT_POINTS} points for the right call and {CLUE_POINTS} for each red flag you spot. Flagging harmless things
              costs {FALSE_FLAG_PENALTY}.
            </li>
            <li>After each email you see every red flag explained.</li>
          </ol>
          <p className="mt-5 text-sm text-faint">
            Nothing here is clickable for real: links never open, and attachments never download.
          </p>
          <Button size="lg" variant="neon" onClick={start} className="mt-7 px-8 font-display text-xs tracking-[0.18em] uppercase">
            Start <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
        <PhishingLeaderboard refreshKey={boardKey} />
      </div>
    );
  }

  if (phase === "done") {
    const pct = total ? score / total : 0;
    const g = grade(pct);
    const correct = results.filter((r) => r.correct).length;
    const found = results.reduce((s, r) => s + r.found, 0);
    const clues = results.reduce((s, r) => s + r.clues, 0);
    return (
      <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-24 space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl p-7 text-center glass sm:p-9"
        >
          <p className="font-display text-xs font-semibold tracking-[0.3em] text-gold uppercase">Your rank</p>
          <h2 className="mt-3 text-chrome font-display text-4xl font-black tracking-[0.06em] uppercase">{g.title}</h2>
          <p className="mt-3 text-muted">{g.text}</p>
          <p className="mt-6 font-display text-5xl font-black text-primary">
            {score}
            <span className="text-2xl text-faint"> / {total}</span>
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-xl border border-line bg-black/40 p-4">
              <dt className="font-mono text-[0.65rem] tracking-[0.18em] text-faint uppercase">Right calls</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-ink">
                {correct}/{results.length}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-black/40 p-4">
              <dt className="font-mono text-[0.65rem] tracking-[0.18em] text-faint uppercase">Red flags spotted</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-ink">
                {found}/{clues}
              </dd>
            </div>
          </dl>
          {user ? (
            saved ? (
              <p className="mt-5 text-sm text-muted">
                {saved.improved
                  ? "New personal best saved!"
                  : `Your best is still ${Math.round((saved.best / saved.total) * 100)}%.`}
              </p>
            ) : null
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className={cn(buttonClasses({ variant: "outline", size: "sm" }), "mt-5")}
            >
              Sign in to save scores to the leaderboard
            </Link>
          )}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button onClick={start} variant="neon" className="px-6">
              <RotateCcw className="size-4" aria-hidden /> Play again
            </Button>
            <Link href="/play" className={buttonClasses({ variant: "outline" })}>
              More games
            </Link>
          </div>
        </motion.div>
        <PhishingLeaderboard refreshKey={boardKey} />
      </div>
    );
  }

  return (
    <div ref={topRef} className="grid scroll-mt-24 gap-6 lg:grid-cols-[15rem_1fr]">
      {/* inbox */}
      <aside aria-label="Inbox" className="hidden lg:block">
        <ol className="space-y-1.5">
          {order.map((e, i) => {
            const r = results.find((x) => x.id === e.id);
            return (
              <li
                key={e.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                  i === index ? "border-primary/50 bg-primary/10 text-ink" : "border-transparent text-faint",
                )}
              >
                {r ? (
                  r.correct ? (
                    <CircleCheck className="size-3.5 shrink-0 text-success" aria-label="right" />
                  ) : (
                    <CircleX className="size-3.5 shrink-0 text-danger" aria-label="wrong" />
                  )
                ) : (
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                )}
                <span className="truncate">{i <= index ? e.from.name : "Unread email"}</span>
              </li>
            );
          })}
        </ol>
      </aside>

      <div className="space-y-5">
        <div className="flex items-center justify-between font-mono text-xs tracking-[0.14em] text-faint uppercase">
          <span>
            Email {index + 1} of {order.length}
          </span>
          <span>
            Score <span className="text-primary">{score}</span>
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={email.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <EmailView email={email} flagged={flagged} answer={answer} onToggle={toggle} />
          </motion.div>
        </AnimatePresence>
        {answer ? (
          <>
            <Feedback email={email} answer={answer} flagged={flagged} />
            <div className="flex justify-end">
              <Button onClick={next} variant="neon" className="px-6">
                {index + 1 >= order.length ? "See my score" : "Next email"} <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">{flagged.size ? `${flagged.size} flagged. ` : ""}What&apos;s your call?</p>
            <div className="flex gap-3">
              <Button variant="danger" onClick={() => decide(true)}>
                <Fish className="size-4" aria-hidden /> Phishing
              </Button>
              <Button variant="outline" onClick={() => decide(false)}>
                <ShieldCheck className="size-4" aria-hidden /> Legit
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
