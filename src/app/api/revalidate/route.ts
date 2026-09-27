import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";

/** Admins call this after editing content so public ISR pages refresh immediately. */
export async function POST() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true, at: new Date().toISOString() });
}
