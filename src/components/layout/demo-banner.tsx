import { FlaskConical } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Shown only when no backend is configured, so nobody mistakes sample data for real data. */
export function DemoBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="border-b border-warning/20 bg-warning/[0.07] px-4 py-2 text-center text-xs text-warning">
      <FlaskConical className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden />
      <strong className="font-semibold">Demo mode:</strong> showing sample content. Add your Supabase keys to{" "}
      <code className="font-mono">.env.local</code> to enable sign-in, tickets and live quizzes.
    </div>
  );
}
