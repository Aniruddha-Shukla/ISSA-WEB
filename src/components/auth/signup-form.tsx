"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, MailCheck, UserPlus } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn, errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { GoogleButton } from "./google-button";
import { DemoAuthNotice, Divider } from "./login-form";
import { emailMatchesDomains, useDomainPolicy } from "./use-domain-policy";

export const BRANCHES = [
  "CSE",
  "IT",
  "ECE",
  "EEE",
  "Mechanical",
  "Civil",
  "Chemical",
  "AI & DS",
  "Cyber Security",
  "MCA",
  "Other",
];

function passwordScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const policy = useDomainPolicy(isSupabaseConfigured);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", roll_no: "", branch: "", year: "" });
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured) return <DemoAuthNotice />;

  const domains = policy?.allowed_domains ?? [];
  const domainList = domains.map((d) => `@${d}`).join(", ");
  const isCollegeEmail = form.email.includes("@") && domains.length > 0 && emailMatchesDomains(form.email, domains);
  const blockedByDomain = Boolean(policy?.restrict_signups && domains.length && form.email.includes("@") && !isCollegeEmail);
  const score = passwordScore(form.password);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (blockedByDomain) {
      setError(`Sign-ups are limited to ${domainList} addresses.`);
      return;
    }
    if (form.password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await getSupabaseBrowserClient().auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        data: {
          full_name: form.full_name.trim(),
          roll_no: form.roll_no.trim() || undefined,
          branch: form.branch || undefined,
          year: form.year || undefined,
        },
      },
    });
    setLoading(false);
    if (signUpError) {
      // The database trigger rejects out-of-policy domains; GoTrue reports that generically.
      setError(
        /database error/i.test(signUpError.message) && domains.length
          ? `Sign-ups are limited to ${domainList} addresses.`
          : errorMessage(signUpError),
      );
      return;
    }
    if (data.session) {
      router.replace(next);
      router.refresh();
    } else {
      setSentTo(form.email.trim());
    }
  }

  if (sentTo) {
    return (
      <div className="card p-8 text-center">
        <MailCheck className="mx-auto size-10 text-primary" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold text-ink">Check your inbox</h2>
        <p className="mt-2 text-sm text-muted">
          We sent a confirmation link to <strong className="text-ink">{sentTo}</strong>. Open it to activate your account.
        </p>
      </div>
    );
  }

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div>
      {domains.length ? (
        <Notice
          tone="info"
          className="mb-5"
          title={policy?.restrict_signups ? `College email required` : "Use your college email"}
        >
          {policy?.restrict_signups
            ? `Only ${domainList} addresses can create accounts.`
            : `Sign up with ${domainList} to be verified as a club member automatically.`}
        </Notice>
      ) : null}
      {error ? (
        <Notice tone="error" className="mb-5" title="Couldn't create your account">
          {error}
        </Notice>
      ) : null}

      <GoogleButton next={next} hostedDomain={domains.length === 1 ? domains[0] : undefined} onError={setError} />
      <Divider />

      <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="su-name" required className="sm:col-span-2">
          <Input id="su-name" autoComplete="name" required maxLength={80} value={form.full_name} onChange={set("full_name")} />
        </Field>
        <Field
          label="Email"
          htmlFor="su-email"
          required
          className="sm:col-span-2"
          error={blockedByDomain ? `Use a ${domainList} address` : null}
          hint={
            isCollegeEmail ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <BadgeCheck className="size-3.5" aria-hidden /> College email — you&apos;ll be verified as a member
              </span>
            ) : undefined
          }
        >
          <Input
            id="su-email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={set("email")}
            aria-invalid={blockedByDomain || undefined}
            aria-describedby={blockedByDomain ? "su-email-error" : isCollegeEmail ? "su-email-hint" : undefined}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="su-password"
          required
          className="sm:col-span-2"
          hint="At least 8 characters. A passphrase is best."
        >
          <Input
            id="su-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={set("password")}
            aria-describedby="su-password-hint"
          />
          <div className="mt-2 flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn("h-1 flex-1 rounded-full", i < score ? (score >= 3 ? "bg-primary" : "bg-warning") : "bg-white/10")}
              />
            ))}
          </div>
        </Field>
        <Field label="Roll number" htmlFor="su-roll" hint="Optional — helps with attendance">
          <Input id="su-roll" maxLength={40} value={form.roll_no} onChange={set("roll_no")} />
        </Field>
        <Field label="Year" htmlFor="su-year">
          <Select id="su-year" value={form.year} onChange={set("year")}>
            <option value="">Select…</option>
            {[1, 2, 3, 4, 5].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Branch" htmlFor="su-branch" className="sm:col-span-2">
          <Select id="su-branch" value={form.branch} onChange={set("branch")}>
            <option value="">Select…</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={blockedByDomain}>
            <UserPlus className="size-4" aria-hidden /> Create account
          </Button>
          <p className="mt-3 text-center text-xs text-faint">
            By joining you agree to hack ethically and follow the ISSA code of conduct.
          </p>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already a member?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
