import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { UsersAdmin } from "@/components/admin/users-admin";

export const metadata: Metadata = { title: "Members" };

export default function AdminUsersPage() {
  return (
    <>
      <AdminPageHeader
        title="Members"
        description="Everyone with an account. Promote verified students to Member, core committee to Admin, and award badges."
      />
      <UsersAdmin />
    </>
  );
}
