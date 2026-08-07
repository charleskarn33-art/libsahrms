"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { companySchema, slugify } from "@/lib/validations/company";
import type { UserRole } from "@/types/database";

export type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

export async function createCompany(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const baseSlug = slugify(parsed.data.name) || "company";
  let slug = baseSlug;
  let attempt = 1;
  // ensure slug uniqueness without relying on a DB-side retry loop
  while (true) {
    const { data: existing } = await supabase.from("companies").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const { data, error } = await supabase
    .from("companies")
    .insert({ ...parsed.data, slug, created_by: user.id })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // creator gets an HR Manager membership by default so they can operate the new company immediately
  await supabase.from("company_memberships").insert({
    company_id: data.id,
    profile_id: user.id,
    role: "hr_manager",
    invited_by: user.id,
  });

  await logAudit({ action: "company_created", entityType: "company", entityId: data.id, companyId: data.id });
  revalidatePath("/companies");
  return { success: true, data: { id: data.id } };
}

export async function inviteMember(companyId: string, email: string, role: UserRole): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: authorized } = await supabase.rpc("is_company_hr_or_admin", { p_company_id: companyId });
  if (!authorized) return { success: false, error: "You don't have permission to manage this company's team." };

  // A brand-new invitee shares no company with the inviter yet, so the
  // regular RLS-scoped client can't see their profile row — look it up
  // with the service-role client instead; the membership write below is
  // still fully RLS-checked.
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) {
    return { success: false, error: "No user found with that email — they must sign up first." };
  }

  const { error } = await supabase
    .from("company_memberships")
    .upsert(
      { company_id: companyId, profile_id: profile.id, role, invited_by: user.id, is_active: true },
      { onConflict: "company_id,profile_id" }
    );

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "member_invited", entityType: "company_membership", entityId: profile.id, companyId, metadata: { role } });
  revalidatePath("/companies");
  return { success: true };
}

export async function removeMember(companyId: string, profileId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_memberships")
    .delete()
    .eq("company_id", companyId)
    .eq("profile_id", profileId);

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "member_removed", entityType: "company_membership", entityId: profileId, companyId });
  revalidatePath("/companies");
  return { success: true };
}
