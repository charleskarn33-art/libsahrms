"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { logAudit } from "@/lib/audit";
import { employeeSchema } from "@/lib/validations/employee";

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

function cleanUuidFields<T extends Record<string, unknown>>(input: T, fields: (keyof T)[]) {
  const output = { ...input };
  for (const field of fields) {
    if (output[field] === "") {
      output[field] = null as never;
    }
  }
  return output;
}

export async function createEmployee(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const payload = cleanUuidFields(parsed.data, ["department_id", "position_id", "supervisor_id", "photo_url"]);

  const { data, error } = await supabase
    .from("employees")
    .insert({ ...payload, company_id: companyId })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({ action: "employee_created", entityType: "employee", entityId: data.id, companyId });
  revalidatePath("/employees");
  return { success: true, data: { id: data.id } };
}

export async function updateEmployee(id: string, input: unknown): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const companyId = await getCurrentCompanyId();
  const supabase = await createClient();
  const payload = cleanUuidFields(parsed.data, ["department_id", "position_id", "supervisor_id", "photo_url"]);

  const { error } = await supabase.from("employees").update(payload).eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({ action: "employee_updated", entityType: "employee", entityId: id, companyId });
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { success: true };
}

export async function deleteEmployee(id: string): Promise<ActionResult> {
  const companyId = await getCurrentCompanyId();
  const supabase = await createClient();
  const { error } = await supabase.from("employees").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({ action: "employee_deleted", entityType: "employee", entityId: id, companyId });
  revalidatePath("/employees");
  return { success: true };
}
