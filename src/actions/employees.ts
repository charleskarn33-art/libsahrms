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

export async function deleteEmployees(ids: string[]): Promise<ActionResult> {
  const companyId = await getCurrentCompanyId();
  const supabase = await createClient();
  const { error } = await supabase.from("employees").delete().in("id", ids);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({ action: "employees_bulk_deleted", entityType: "employee", companyId, metadata: { count: ids.length } });
  revalidatePath("/employees");
  return { success: true };
}

export interface ImportRowResult {
  row: number;
  employeeNumber: string;
  status: "created" | "skipped";
  reason?: string;
}

/**
 * Bulk-creates employees from parsed CSV rows keyed by column header
 * (Employee Number, First Name, Middle Name, Last Name, Email, Phone,
 * Department, Position, Date Hired, Basic Salary). Unknown Department /
 * Position names are left unset rather than failing the row — HR can
 * fix those up afterward from the employee list.
 */
export async function bulkImportEmployees(rows: Record<string, string>[]): Promise<ActionResult<{ results: ImportRowResult[] }>> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const [{ data: departments }, { data: positions }] = await Promise.all([
    supabase.from("departments").select("id, name").eq("company_id", companyId),
    supabase.from("positions").select("id, title").eq("company_id", companyId),
  ]);

  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const employeeNumber = row["Employee Number"]?.trim();
    const firstName = row["First Name"]?.trim();
    const lastName = row["Last Name"]?.trim();

    if (!employeeNumber || !firstName || !lastName) {
      results.push({ row: i + 2, employeeNumber: employeeNumber || "—", status: "skipped", reason: "Missing Employee Number, First Name, or Last Name" });
      continue;
    }

    const departmentId = departments?.find((d) => d.name.toLowerCase() === row["Department"]?.trim().toLowerCase())?.id ?? null;
    const positionId = positions?.find((p) => p.title.toLowerCase() === row["Position"]?.trim().toLowerCase())?.id ?? null;
    const basicSalary = Number(row["Basic Salary"]);

    const { error } = await supabase.from("employees").insert({
      company_id: companyId,
      employee_number: employeeNumber,
      first_name: firstName,
      middle_name: row["Middle Name"]?.trim() || null,
      last_name: lastName,
      email: row["Email"]?.trim() || null,
      phone: row["Phone"]?.trim() || null,
      department_id: departmentId,
      position_id: positionId,
      date_hired: row["Date Hired"]?.trim() || new Date().toISOString().slice(0, 10),
      basic_salary: Number.isFinite(basicSalary) ? basicSalary : 0,
      employment_type: "full_time",
      employment_status: "active",
      payment_method: "bank",
      tax_status: "single",
    });

    results.push(
      error
        ? { row: i + 2, employeeNumber, status: "skipped", reason: error.message }
        : { row: i + 2, employeeNumber, status: "created" }
    );
  }

  const createdCount = results.filter((r) => r.status === "created").length;
  await logAudit({
    action: "employees_bulk_imported",
    entityType: "employee",
    companyId,
    metadata: { created: createdCount, total: rows.length },
  });
  revalidatePath("/employees");

  return { success: true, data: { results } };
}
