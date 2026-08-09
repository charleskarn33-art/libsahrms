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
  const payload = cleanUuidFields(parsed.data, ["department_id", "position_id", "supervisor_id", "photo_url", "date_of_birth"]);

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
  const payload = cleanUuidFields(parsed.data, ["department_id", "position_id", "supervisor_id", "photo_url", "date_of_birth"]);

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

function cell(row: Record<string, string>, header: string) {
  return row[header]?.trim() || "";
}

/** Matches CSV enum text loosely — "Full Time" / "full-time" / "full_time" all resolve the same way. */
function normalizeEnumCell(row: Record<string, string>, header: string) {
  return cell(row, header).toLowerCase().replace(/[\s-]+/g, "_");
}

function numberOrDefault(value: string, fallback: number) {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const EMPLOYMENT_TYPE_VALUES = ["full_time", "part_time", "contract", "intern", "temporary"];
const EMPLOYMENT_STATUS_VALUES = ["active", "probation", "on_leave", "suspended", "terminated", "resigned", "retired"];

/**
 * "Employment Type" (full-time/part-time/…) and "Employment Status"
 * (active/on leave/…) are easy to mix up in a spreadsheet since both sound
 * like the same idea. If a cell holds a value that's valid for the *other*
 * column, move it there instead of failing the row.
 */
function resolveEmploymentFields(row: Record<string, string>) {
  let type = normalizeEnumCell(row, "Employment Type");
  let status = normalizeEnumCell(row, "Employment Status");

  if (status && !EMPLOYMENT_STATUS_VALUES.includes(status) && EMPLOYMENT_TYPE_VALUES.includes(status)) {
    if (!type) type = status;
    status = "";
  }
  if (type && !EMPLOYMENT_TYPE_VALUES.includes(type) && EMPLOYMENT_STATUS_VALUES.includes(type)) {
    if (!status) status = type;
    type = "";
  }

  return { employment_type: type || "full_time", employment_status: status || "active" };
}

/**
 * Accepts ISO (YYYY-MM-DD) or day-first slash/dash dates (DD/MM/YYYY,
 * DD-MM-YYYY) — day-first because that's the format this app's users
 * write in, and Postgres's `date` column rejects "" outright, so a blank
 * cell must become null rather than passing an empty string through.
 * Returns an error for anything else so a typo is reported clearly
 * instead of failing as a raw database error.
 */
function parseDateCell(value: string): { value: string | null; error?: string } {
  if (!value) return { value: null };

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return { value };
  }

  const m = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const d = new Date(iso);
    if (d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day) {
      return { value: iso };
    }
  }

  return { value: null, error: `"${value}" isn't a recognized date — use YYYY-MM-DD or DD/MM/YYYY` };
}

/**
 * Bulk-creates employees from parsed CSV rows keyed by column header — the
 * full field set the Add Employee form supports (see TEMPLATE_HEADERS in
 * import-employees-dialog.tsx), not just the identity/payroll basics.
 * Department / Position / Supervisor are matched by name (or, for
 * supervisor, Employee Number) against existing company records; unmatched
 * names are left unset rather than failing the row. Each row is validated
 * with the same employeeSchema the single-employee form uses, so a bad enum
 * value (e.g. a typo'd Employment Type) is reported clearly instead of
 * failing as a raw database error.
 */
export async function bulkImportEmployees(rows: Record<string, string>[]): Promise<ActionResult<{ results: ImportRowResult[] }>> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const [{ data: departments }, { data: positions }, { data: existingEmployees }] = await Promise.all([
    supabase.from("departments").select("id, name").eq("company_id", companyId),
    supabase.from("positions").select("id, title").eq("company_id", companyId),
    supabase.from("employees").select("id, employee_number").eq("company_id", companyId),
  ]);

  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const employeeNumber = cell(row, "Employee Number");

    if (!employeeNumber || !cell(row, "First Name") || !cell(row, "Last Name")) {
      results.push({ row: i + 2, employeeNumber: employeeNumber || "—", status: "skipped", reason: "Missing Employee Number, First Name, or Last Name" });
      continue;
    }

    const departmentId = departments?.find((d) => d.name.toLowerCase() === cell(row, "Department").toLowerCase())?.id ?? "";
    const positionId = positions?.find((p) => p.title.toLowerCase() === cell(row, "Position").toLowerCase())?.id ?? "";
    const supervisorId =
      existingEmployees?.find((e) => e.employee_number.toLowerCase() === cell(row, "Supervisor Employee Number").toLowerCase())?.id ?? "";
    const { employment_type: employmentType, employment_status: employmentStatus } = resolveEmploymentFields(row);

    const dateOfBirth = parseDateCell(cell(row, "Date of Birth"));
    if (dateOfBirth.error) {
      results.push({ row: i + 2, employeeNumber, status: "skipped", reason: `Date of Birth: ${dateOfBirth.error}` });
      continue;
    }
    const dateHiredCell = cell(row, "Date Hired");
    const dateHired = dateHiredCell ? parseDateCell(dateHiredCell) : { value: new Date().toISOString().slice(0, 10) };
    if (dateHired.error) {
      results.push({ row: i + 2, employeeNumber, status: "skipped", reason: `Date Hired: ${dateHired.error}` });
      continue;
    }

    const candidate = {
      employee_number: employeeNumber,
      first_name: cell(row, "First Name"),
      middle_name: cell(row, "Middle Name"),
      last_name: cell(row, "Last Name"),

      gender: normalizeEnumCell(row, "Gender") || undefined,
      date_of_birth: dateOfBirth.value ?? "",
      marital_status: normalizeEnumCell(row, "Marital Status") || undefined,
      nationality: cell(row, "Nationality"),
      county: cell(row, "County"),
      district: cell(row, "District"),
      address: cell(row, "Address"),

      phone: cell(row, "Phone"),
      email: cell(row, "Email"),
      emergency_contact_name: cell(row, "Emergency Contact Name"),
      emergency_contact_phone: cell(row, "Emergency Contact Phone"),
      emergency_contact_relationship: cell(row, "Emergency Contact Relationship"),

      department_id: departmentId,
      position_id: positionId,
      supervisor_id: supervisorId,

      employment_type: employmentType,
      employment_status: employmentStatus,
      date_hired: dateHired.value!,

      salary_grade: cell(row, "Salary Grade"),
      basic_salary: numberOrDefault(cell(row, "Basic Salary"), 0),
      transport_allowance: numberOrDefault(cell(row, "Transport Allowance"), 0),
      housing_allowance: numberOrDefault(cell(row, "Housing Allowance"), 0),
      relocation_allowance: numberOrDefault(cell(row, "Relocation Allowance"), 0),
      standard_bonus: numberOrDefault(cell(row, "Standard Bonus"), 0),
      standard_commission: numberOrDefault(cell(row, "Standard Commission"), 0),

      bank_name: cell(row, "Bank Name"),
      bank_account_number: cell(row, "Bank Account Number"),
      orange_money_number: cell(row, "Orange Money Number"),
      payment_method: normalizeEnumCell(row, "Payment Method") || "bank",

      tin: cell(row, "TIN"),
      nasscorp_number: cell(row, "NASSCORP Number"),
      tax_status: normalizeEnumCell(row, "Tax Status") || "single",

      medical_information: cell(row, "Medical Information"),
    };

    const parsed = employeeSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const reason = issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid data";
      results.push({ row: i + 2, employeeNumber, status: "skipped", reason });
      continue;
    }

    const payload = cleanUuidFields(parsed.data, ["department_id", "position_id", "supervisor_id", "photo_url", "date_of_birth"]);
    const { error } = await supabase.from("employees").insert({ ...payload, company_id: companyId });

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
