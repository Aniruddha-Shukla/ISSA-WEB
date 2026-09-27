"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { GoogleButton } from "./google-button";
import { useDomainPolicy } from "./use-domain-policy";

export function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs tracking-[0.18em] text-faint uppercase">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function DemoAuthNotice() {
  return (
    <Notice tone="warning" title="Sign-in is disabled in demo mode">
      Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code className="font-mono">.env.local</code>,
      apply the database migration, and restart the dev server.
    </Notice>
  );
}

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const router = useRouter();
  const policy = useDomainPolicy(isSupabaseConfigured);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured) return <DemoAuthNotice />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setLoading(false);
      const notConfirmed = /confirm/i.test(signInError.message);
      setUnconfirmed(notConfirmed);
      setError(notConfirmed ? "Please confirm your email address first — check your inbox." : errorMessage(signInError));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function resend() {
    const { error: resendError } = await getSupabaseBrowserClient().auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setInfo(resendError ? errorMessage(resendError) : "Confirmation email sent again.");
  }

  const hostedDomain = policy?.allowed_domains.length === 1 ? policy.allowed_domains[0] : undefined;

  return (
    <div>
      {error ? (
        <Notice tone="error" className="mb-5" title="Sign-in failed">
          {error}
          {unconfirmed ? (
            <button type="button" onClick={resend} className="ml-1 underline">
              Resend email
            </button>
          ) : null}
        </Notice>
      ) : null}
      {info ? <Notice className="mb-5">{info}</Notice> : null}

      <GoogleButton next={next} hostedDomain={hostedDomain} onError={setError} />
      <Divider />

      <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
        <Field label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={hostedDomain ? `you@${hostedDomain}` : "you@college.edu"}
          />
        </Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-ink">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-muted hover:text-primary">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-faint hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          <LogIn className="size-4" aria-hidden /> Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        New to ISSA?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
