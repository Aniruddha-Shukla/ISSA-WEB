import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Notice } from "@/components/ui/feedback";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ExportsPanel } from "@/components/admin/exports-panel";

export const metadata: Metadata = { title: "Exports" };

export default async function ExportsPage() {
  const supabase = await createSupabaseServerClient();
  const [events, quizzes] = await Promise.all([
    supabase.from("events").select("id, title").order("starts_at", { ascending: false }),
    supabase.from("quizzes").select("id, title").order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Data exports"
        description="Download collected data as CSV (opens in Excel / Sheets) or JSON. Exports contain personal data — store and share them responsibly."
      />
      <Notice tone="info" className="mb-6" title="Safe for spreadsheets">
        Cells that could be interpreted as spreadsheet formulas are escaped automatically.
      </Notice>
      <ExportsPanel
        events={(events.data as { id: string; title: string }[]) ?? []}
        quizzes={(quizzes.data as { id: string; title: string }[]) ?? []}
      />
    </>
  );
}
