import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_COMPANY_COOKIE } from "@/lib/constants";
import type { MyCompanyRow } from "@/types/database";

/**
 * Resolves the company the current request should operate against:
 * the cookie value if it's still one the user belongs to, otherwise
 * their first available company. Returns null if the user belongs to
 * no company yet (e.g. a brand new Super Admin before creating one).
 */
export async function getCurrentCompany(): Promise<{ company: MyCompanyRow; all: MyCompanyRow[] } | null> {
  const supabase = await createClient();
  const { data: companies } = await supabase.from("v_my_companies").select("*").order("name");

  const all = (companies ?? []) as MyCompanyRow[];
  if (all.length === 0) return null;

  const cookieStore = await cookies();
  const requestedId = cookieStore.get(CURRENT_COMPANY_COOKIE)?.value;

  const company = all.find((c) => c.company_id === requestedId) ?? all[0];
  return { company, all };
}

export async function getCurrentCompanyId(): Promise<string | null> {
  const result = await getCurrentCompany();
  return result?.company.company_id ?? null;
}
