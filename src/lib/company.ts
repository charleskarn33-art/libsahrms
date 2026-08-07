import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_COMPANY_COOKIE } from "@/lib/constants";
import type { MyCompanyRow } from "@/types/database";

/**
 * Resolves the company the current request should operate against, in
 * priority order: the cookie (an explicit in-session switch), then the
 * user's admin-pinned default company, then their first available
 * company alphabetically. Returns null if the user belongs to none yet.
 */
export async function getCurrentCompany(): Promise<{ company: MyCompanyRow; all: MyCompanyRow[] } | null> {
  const supabase = await createClient();
  const { data: companies } = await supabase.from("v_my_companies").select("*").order("name");

  const all = (companies ?? []) as MyCompanyRow[];
  if (all.length === 0) return null;

  const cookieStore = await cookies();
  const requestedId = cookieStore.get(CURRENT_COMPANY_COOKIE)?.value;

  const fromCookie = requestedId ? all.find((c) => c.company_id === requestedId) : undefined;
  if (fromCookie) return { company: fromCookie, all };

  const defaultCompanyId = await getDefaultCompanyId(supabase);
  const fromDefault = defaultCompanyId ? all.find((c) => c.company_id === defaultCompanyId) : undefined;
  if (fromDefault) return { company: fromDefault, all };

  return { company: all[0], all };
}

export async function getCurrentCompanyId(): Promise<string | null> {
  const result = await getCurrentCompany();
  return result?.company.company_id ?? null;
}

async function getDefaultCompanyId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_company_id")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.default_company_id ?? null;
}
