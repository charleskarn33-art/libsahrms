"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { logAudit } from "@/lib/audit";
import { departmentSchema, positionSchema } from "@/lib/validations/department";

export type ActionResult = { success: true } | { success: false; error: string };

function nullifyEmpty<T extends Record<string, unknown>>(input: T, fields: (keyof T)[]) {
  const output = { ...input };
  for (const field of fields) {
    if (output[field] === "") output[field] = null as never;
  }
  return output;
}

export async function createDepartment(input: unknown): Promise<ActionResult> {
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const payload = nullifyEmpty(parsed.data, ["code", "description", "head_employee_id"]);
  const { data, error } = await supabase
    .from("departments")
    .insert({ ...payload, company_id: companyId })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };

  await logAudit({ action: "department_created", entityType: "department", entityId: data.id, companyId });
  revalidatePath("/departments");
  return { success: true };
}

export async function updateDepartment(id: string, input: unknown): Promise<ActionResult> {
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  const supabase = await createClient();
  const payload = nullifyEmpty(parsed.data, ["code", "description", "head_employee_id"]);
  const { error } = await supabase.from("departments").update(payload).eq("id", id);
  if (error) return { success: false, error: error.message };

  await logAudit({ action: "department_updated", entityType: "department", entityId: id, companyId });
  revalidatePath("/departments");
  return { success: true };
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  const companyId = await getCurrentCompanyId();
  const supabase = await createClient();
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  await logAudit({ action: "department_deleted", entityType: "department", entityId: id, companyId });
  revalidatePath("/departments");
  return { success: true };
}

export async function createPosition(input: unknown): Promise<ActionResult> {
  const parsed = positionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const payload = nullifyEmpty(parsed.data, ["department_id", "salary_grade", "description"]);
  const { data, error } = await supabase
    .from("positions")
    .insert({ ...payload, company_id: companyId })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };

  await logAudit({ action: "position_created", entityType: "position", entityId: data.id, companyId });
  revalidatePath("/departments");
  return { success: true };
}

export async function deletePosition(id: string): Promise<ActionResult> {
  const companyId = await getCurrentCompanyId();
  const supabase = await createClient();
  const { error } = await supabase.from("positions").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  await logAudit({ action: "position_deleted", entityType: "position", entityId: id, companyId });
  revalidatePath("/departments");
  return { success: true };
}
