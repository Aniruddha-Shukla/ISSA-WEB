"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "./env";

let browserClient: SupabaseClient | undefined;

/**
 * Browser Supabase client (session stored in cookies so Server Components can
 * read it). Only call this when `isSupabaseConfigured` is true.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  browserClient ??= createBrowserClient(supabaseUrl, supabaseKey);
  return browserClient;
}
