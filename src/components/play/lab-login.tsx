"use client";

import { useState, type FormEvent } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

// The intern's "secure" login for the Inspect Element challenge: the check runs in
// the browser, so anyone can read it. (Base64 is an encoding, not encryption.)
const ADMIN_USER = "admin";
const ADMIN_PASS_B64 = "bDN0bTNpbl80ZG0xbg==";
const SECRET_B64 = "SVNTQXtjbDEzbnRfczFkM19jaDNja3NfNHIzX3VzM2wzc3N9";

export function LabLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "denied" | "granted">("idle");

  function login(event: FormEvent) {
    event.preventDefault();
    let ok = false;
    try {
      ok = username.trim().toLowerCase() === ADMIN_USER && btoa(password) === ADMIN_PASS_B64;
    } catch {
      ok = false; // btoa throws on non-Latin-1 input
    }
    setState(ok ? "granted" : "denied");
  }

  if (state === "granted") {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/[0.06] p-8 text-center">
        <ShieldCheck className="mx-auto size-10 text-success" aria-hidden />
        <p className="mt-4 font-display text-lg font-bold tracking-[0.1em] text-ink uppercase">Welcome back, admin</p>
        <p className="mt-2 text-sm text-muted">Your secret note:</p>
        <p className="mt-4 rounded-lg border border-line bg-black/60 px-4 py-3 font-mono text-gold">{atob(SECRET_B64)}</p>
        <p className="mt-4 text-xs text-faint">Submit it in the CTF arena under “Inspect Element”.</p>
      </div>
    );
  }

  return (
    <form onSubmit={login} className="space-y-4 rounded-2xl border border-line-strong bg-[#0d1117] p-7">
      <p className="flex items-center gap-2 font-mono text-xs tracking-[0.18em] text-faint uppercase">
        <Lock className="size-3.5" aria-hidden /> MegaCorp intranet · admin portal
      </p>
      <Field htmlFor="lab-user" label="Username">
        <Input id="lab-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
      </Field>
      <Field htmlFor="lab-pass" label="Password">
        <Input id="lab-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
      </Field>
      {state === "denied" ? (
        <p role="alert" className="text-sm text-danger">
          Access denied. (Our intern promises the check is unbreakable.)
        </p>
      ) : null}
      <Button type="submit" className="w-full">
        Sign in
      </Button>
    </form>
  );
}
