import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  return createClient(url, key);
}

/**
 * Service-role server client — bypasses RLS.
 * Use only in trusted server code for tables secured with RLS and no open policies
 * (e.g. executive_assistant_conversations / feedback). Never expose to the browser.
 */
export function createSupabaseServiceRoleClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

export function isSupabaseServiceRoleConfigured() {
  const url = process.env.SUPABASE_URL?.trim() ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  // Reject empty / linked-placeholder values like "env_OoBr…" that are not JWTs.
  return Boolean(
    url.startsWith("https://") &&
      key.length > 40 &&
      !key.startsWith("env_") &&
      key !== "[SENSITIVE]",
  );
}
