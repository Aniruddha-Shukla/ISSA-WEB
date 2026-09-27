// NEXT_PUBLIC_* values are inlined at build time, so they must be read with
// literal property access.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** False in "demo mode": the site renders sample content and interactive features explain how to connect a backend. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
