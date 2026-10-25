"use client";

import { useEffect } from "react";
import { huntFlags } from "@/content/flag-hunt";

/** Flag hunt: a note for whoever opens the browser console (encoded, of course). */
export function ConsoleEgg() {
  useEffect(() => {
    console.log(
      "%c I.S.S.A %c curious? good. ",
      "background:#22d3ee;color:#001a20;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px",
      "background:#111;color:#ffd43b;padding:2px 6px;border-radius:0 4px 4px 0",
    );
    console.log(`psst, a flag for the hunt (base64): ${btoa(huntFlags.console)}\nSubmit it at /play/flag-hunt`);
  }, []);
  return null;
}
