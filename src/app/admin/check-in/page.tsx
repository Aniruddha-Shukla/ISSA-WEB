import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CheckInConsole } from "@/components/admin/check-in-console";

export const metadata: Metadata = { title: "Check-in" };

export default async function CheckInPage({ searchParams }: PageProps<"/admin/check-in">) {
  const { code } = await searchParams;
  return (
    <>
      <AdminPageHeader
        title="Event check-in"
        description="Scan attendee QR tickets or type their confirmation ID. Duplicate and cancelled tickets are flagged instantly."
      />
      <CheckInConsole initialCode={typeof code === "string" ? code : undefined} />
    </>
  );
}
