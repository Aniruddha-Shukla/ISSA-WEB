import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getAdminProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AdminNav } from "@/components/admin/admin-nav";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Container } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · ISSA Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!isSupabaseConfigured) {
    return (
      <Container className="max-w-2xl py-20">
        <Notice tone="warning" title="The admin dashboard needs the backend">
          Configure Supabase (see README), sign up, then promote your account to admin with the SQL snippet in the README.
        </Notice>
      </Container>
    );
  }

  // Server-side role check. RLS enforces the same rule in the database.
  const admin = await getAdminProfile("/admin");
  if (!admin) {
    return (
      <Container className="flex max-w-xl flex-col items-center py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <ShieldAlert className="size-7" aria-hidden />
        </span>
        <h1 className="mt-6 text-2xl font-semibold text-ink">Core team only</h1>
        <p className="mt-3 text-muted">
          The admin dashboard is limited to ISSA core committee members. If you should have access, ask an existing admin to
          update your role.
        </p>
        <ButtonLink href="/" variant="outline" className="mt-8">
          Back to the site
        </ButtonLink>
      </Container>
    );
  }

  return (
    <div className="mx-auto grid max-w-[90rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[15rem_1fr] lg:gap-10 lg:px-8 lg:py-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Link href="/profile" className="mb-5 hidden items-center gap-3 rounded-xl border border-line bg-surface p-3 lg:flex">
          <Avatar name={admin.full_name ?? admin.email} src={admin.avatar_url} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">{admin.full_name ?? admin.email}</span>
            <span className="block font-mono text-[0.65rem] tracking-[0.18em] text-accent uppercase">core team</span>
          </span>
        </Link>
        <AdminNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
