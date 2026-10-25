"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { CircleCheck, Flag, LogIn } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn, errorMessage } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { badgeNames, SOLVED_EVENT } from "./play-meta";

type Result = { correct: boolean; already_solved?: boolean; points?: number; first_blood?: boolean; badges?: string[] };

/** Flag input for one challenge. Checking happens in the database; the flag never reaches the browser. */
export function FlagForm({ challengeId, title, solved }: { challengeId: string; title: string; solved: boolean }) {
  const { user, loading } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(0); // bumps to replay the shake

  if (solved) {
    return (
      <p className="flex items-center gap-2 font-display text-xs font-semibold tracking-[0.16em] text-success uppercase">
        <CircleCheck className="size-4" aria-hidden /> Solved
      </p>
    );
  }
  if (!loading && !user) {
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
        <LogIn className="size-4" aria-hidden /> Sign in to submit flags
      </Link>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    const { data, error } = await getSupabaseBrowserClient().rpc("submit_ctf_flag", {
      p_challenge_id: challengeId,
      p_flag: value,
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't check the flag", errorMessage(error));
      return;
    }
    const result = data as Result;
    if (!result.correct) {
      setWrong((n) => n + 1);
      return;
    }
    setValue("");
    if (!result.already_solved) {
      toast.success(`+${result.points} points`, result.first_blood ? `First blood on “${title}”!` : `“${title}” solved.`);
      for (const badge of result.badges ?? []) toast.success("Badge unlocked", badgeNames[badge] ?? badge);
    }
    window.dispatchEvent(new Event(SOLVED_EVENT));
  }

  return (
    <form onSubmit={submit} className="w-full">
      <motion.div
        key={wrong}
        animate={wrong ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
        transition={{ duration: 0.35 }}
        className="flex gap-2"
      >
        <label htmlFor={`flag-${challengeId}`} className="sr-only">
          Flag for {title}
        </label>
        <Input
          id={`flag-${challengeId}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ISSA{...}"
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
          className={cn("font-mono", wrong ? "border-danger/60" : undefined)}
        />
        <Button type="submit" loading={busy} className="h-11 shrink-0">
          <Flag className="size-4" aria-hidden /> Submit
        </Button>
      </motion.div>
      <p role="status" className="mt-2 min-h-5 text-sm text-danger">
        {wrong ? "Not quite. Check for typos and try again." : ""}
      </p>
    </form>
  );
}
