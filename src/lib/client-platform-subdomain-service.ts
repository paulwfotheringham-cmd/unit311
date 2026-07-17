import {
  buildClientPlatformUrl,
  isReservedUnit311Subdomain,
  slugifyClientSubdomain,
} from "@/lib/client-platform-subdomain";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

async function subdomainTaken(subdomain: string, excludeClientId?: string) {
  if (isReservedUnit311Subdomain(subdomain)) {
    return true;
  }

  const supabase = requireSupabase();
  let query = supabase
    .from("internal_clients")
    .select("id")
    .eq("platform_subdomain", subdomain)
    .limit(1);

  if (excludeClientId) {
    query = query.neq("id", excludeClientId);
  }

  const { data, error } = await query;
  if (error && !error.message.includes("platform_subdomain")) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
}

export async function allocateClientPlatformSubdomain(
  companyName: string,
  excludeClientId?: string,
): Promise<{ subdomain: string; platformUrl: string }> {
  const base = slugifyClientSubdomain(companyName);
  let candidate = base;
  let suffix = 2;

  while (await subdomainTaken(candidate, excludeClientId)) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }

  return {
    subdomain: candidate,
    platformUrl: buildClientPlatformUrl(candidate),
  };
}

