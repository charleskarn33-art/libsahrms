"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { logAudit } from "@/lib/audit";
import { leaveTypeSettingsSchema, leavePolicySchema } from "@/lib/validations/leave-settings";
import { LEAVE_TYPES, LEAVE_TYPE_DEFAULTS } from "@/lib/leave-types";
import type { LeaveType } from "@/types/database";

export type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

export async function updateLeaveTypeSettings(input: unknown): Promise<ActionResult> {
  const parsed = leaveTypeSettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leave_type_settings")
    .upsert({ ...parsed.data, company_id: companyId }, { onConflict: "company_id,leave_type" });
  if (error) return { success: false, error: error.message };

  await logAudit({
    action: "leave_type_settings_updated",
    entityType: "leave_type_settings",
    entityId: parsed.data.leave_type,
    companyId,
  });
  revalidatePath("/leave/settings");
  return { success: true };
}

export async function updateLeavePolicy(input: unknown): Promise<ActionResult> {
  const parsed = leavePolicySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leave_policies")
    .upsert({ ...parsed.data, company_id: companyId }, { onConflict: "company_id" });
  if (error) return { success: false, error: error.message };

  await logAudit({ action: "leave_policy_updated", entityType: "leave_policy", entityId: companyId, companyId });
  revalidatePath("/leave/settings");
  return { success: true };
}

export async function bulkApplyEntitlements(year: number): Promise<ActionResult<{ applied: number }>> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { success: false, error: "Invalid year" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();

  const [{ data: employees }, { data: typeSettingsRows }] = await Promise.all([
    supabase.from("employees").select("id").eq("company_id", companyId).eq("employment_status", "active"),
    supabase.from("leave_type_settings").select("leave_type, default_days, is_active").eq("company_id", companyId),
  ]);

  const settingsByType = new Map((typeSettingsRows ?? []).map((t) => [t.leave_type as LeaveType, t]));
  const activeTypes = LEAVE_TYPES.filter((t) => settingsByType.get(t)?.is_active ?? true);

  if (!employees?.length || !activeTypes.length) {
    return { success: true, data: { applied: 0 } };
  }

  const rows = employees.flatMap((e) =>
    activeTypes.map((t) => ({
      employee_id: e.id,
      company_id: companyId,
      leave_type: t,
      year,
      entitled_days: settingsByType.get(t)?.default_days ?? LEAVE_TYPE_DEFAULTS[t].default_days,
    }))
  );

  const { error } = await supabase.from("leave_balances").upsert(rows, { onConflict: "employee_id,leave_type,year" });
  if (error) return { success: false, error: error.message };

  await logAudit({
    action: "leave_entitlements_bulk_applied",
    entityType: "leave_balances",
    entityId: companyId,
    companyId,
    metadata: { year, employees: employees.length, types: activeTypes.length },
  });
  revalidatePath("/leave/settings");
  revalidatePath("/leave/balance");
  return { success: true, data: { applied: rows.length } };
}
