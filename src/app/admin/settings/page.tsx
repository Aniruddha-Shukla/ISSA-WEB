import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Sign-up policy"
        description="Control who can join and who is verified as a club member automatically."
      />
      <SettingsForm />
    </>
  );
}
