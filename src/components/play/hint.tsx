"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";

export function Hint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <p className="flex gap-2 rounded-xl border border-gold/25 bg-gold/[0.06] px-3.5 py-2.5 text-sm text-ink/90">
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
      {text}
    </p>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 text-sm text-faint transition-colors hover:text-gold"
    >
      <Lightbulb className="size-4" aria-hidden /> Show hint
    </button>
  );
}
