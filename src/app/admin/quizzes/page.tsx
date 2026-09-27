import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { QuizzesAdmin } from "@/components/admin/quizzes-admin";

export const metadata: Metadata = { title: "Quizzes" };

export default function AdminQuizzesPage() {
  return (
    <>
      <AdminPageHeader
        title="Quizzes"
        description="Build timed multiple-choice quizzes. Host live quizzes from the console, or publish self-paced ones with an open window."
      />
      <QuizzesAdmin />
    </>
  );
}
