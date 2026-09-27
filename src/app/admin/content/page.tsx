import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ContentAdmin } from "@/components/admin/content-admin";

export const metadata: Metadata = { title: "Site content" };

export default function AdminContentPage() {
  return (
    <>
      <AdminPageHeader
        title="Site content"
        description="Manage what visitors see on the home page. Changes go live immediately."
      />
      <ContentAdmin />
    </>
  );
}
