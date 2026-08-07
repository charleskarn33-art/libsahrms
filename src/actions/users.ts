"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/types/database";

export type ActionResult = { success: true } | { success: false; error: string };

const VALID_ROLES: UserRole[] = [
  "super_admin",
  "hr_manager",
  "payroll_officer",
  "finance_manager",
  "managing_director",
  "employee",
  "auditor",
];

export async function updateUserRole(profileId: string, role: string): Promise<ActionResult> {
  if (!VALID_ROLES.includes(role as UserRole)) {
    return { success: false, error: "Invalid role" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) return { success: false, error: error.message };

  await logAudit({ action: "user_role_updated", entityType: "profile", entityId: profileId, metadata: { role } });
  revalidatePath("/settings/users");
  return { success: true };
}

export async function toggleUserActive(profileId: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", profileId);
  if (error) return { success: false, error: error.message };

  await logAudit({ action: isActive ? "user_activated" : "user_deactivated", entityType: "profile", entityId: profileId });
  revalidatePath("/settings/users");
  return { success: true };
}
