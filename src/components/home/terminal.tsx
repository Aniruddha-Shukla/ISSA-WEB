"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useHydrated } from "@/lib/hooks";

type Line = { kind: "cmd" | "out" | "ok"; text: string };

/** Decorative terminal that "types" a short session. Static when reduced motion is preferred. */
export function Terminal({ nextEvent }: { nextEvent?: string }) {
  const prefersReduced = useReducedMotion();
  const hydrated = useHydrated();
  const reduce = hydrated && Boolean(prefersReduced);
  const script: Line[] = [
    { kind: "cmd", text: "whoami" },
    { kind: "out", text: "curious-student" },
    { kind: "cmd", text: "./join --club issa" },
    { kind: "ok", text: "[+] handshake complete" },
    { kind: "ok", text: "[+] role granted: member" },
    { kind: "cmd", text: "cat ~/upcoming.txt" },
    { kind: "out", text: nextEvent ? `> ${nextEvent}` : "> new events dropping soon" },
    { kind: "cmd", text: "echo $MOTTO" },
    { kind: "out", text: "hack. defend. build." },
  ];

  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const done = lineIndex >= script.length;

  useEffect(() => {
    if (reduce || done) return;
    const line = script[lineIndex];
    if (line.kind !== "cmd") {
      const t = setTimeout(() => {
        setLineIndex((i) => i + 1);
        setCharIndex(0);
      }, 260);
      return () => clearTimeout(t);
    }
    if (charIndex < line.text.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 45 + Math.random() * 45);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLineIndex((i) => i + 1);
      setCharIndex(0);
    }, 420);
    return () => clearTimeout(t);
    // script is derived from props and stable for a given render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, done, lineIndex, charIndex]);

  const visible = reduce ? script : script.slice(0, lineIndex + 1);

  return (
    <div className="relative overflow-hidden card font-mono text-[0.8rem] leading-relaxed shadow-2xl shadow-black/60 sm:text-sm">
      <div className="flex items-center gap-2 border-b border-line bg-white/[0.02] px-4 py-3">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-faint">issa@lab: ~</span>
      </div>
      <p className="sr-only">Terminal animation showing a student joining the ISSA club.</p>
      <div className="min-h-[17.5rem] space-y-1.5 p-5" aria-hidden>
        {visible.map((line, i) => {
          const isCurrent = !reduce && i === lineIndex;
          const text = isCurrent && line.kind === "cmd" ? line.text.slice(0, charIndex) : line.text;
          if (line.kind === "cmd") {
            return (
              <p key={i} className="text-ink">
                <span className="text-primary">➜</span> <span className="text-cyan">~</span> {text}
                {isCurrent ? <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-primary" /> : null}
              </p>
            );
          }
          return (
            <p key={i} className={line.kind === "ok" ? "text-primary" : "text-muted"}>
              {text}
            </p>
          );
        })}
        {done || reduce ? (
          <p className="text-ink">
            <span className="text-primary">➜</span> <span className="text-cyan">~</span>{" "}
            <span className="inline-block h-4 w-2 translate-y-0.5 animate-blink bg-primary" />
          </p>
        ) : null}
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="h-1/3 w-full animate-scan bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent" />
      </div>
    </div>
  );
}
