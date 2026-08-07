"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { loanRequestSchema } from "@/lib/validations/loan";

export type ActionResult = { success: true } | { success: false; error: string };

export async function requestLoan(employeeId: string, input: unknown): Promise<ActionResult> {
  const parsed = loanRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: employee } = await supabase.from("employees").select("company_id").eq("id", employeeId).single();
  if (!employee) return { success: false, error: "Employee not found" };

  const { data, error } = await supabase
    .from("loans")
    .insert({
      employee_id: employeeId,
      company_id: employee.company_id,
      loan_type: parsed.data.loan_type,
      principal_amount: parsed.data.principal_amount,
      monthly_deduction: parsed.data.monthly_deduction,
      balance_remaining: parsed.data.principal_amount,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "loan_requested", entityType: "loan", entityId: data.id, companyId: employee.company_id });
  revalidatePath("/loans");
  return { success: true };
}

export async function decideLoan(id: string, decision: "approved" | "rejected"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: loan, error } = await supabase
    .from("loans")
    .update({
      status: decision === "approved" ? "active" : "rejected",
      approved_by: user?.id ?? null,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("company_id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: `loan_${decision}`, entityType: "loan", entityId: id, companyId: loan?.company_id });
  revalidatePath("/loans");
  revalidatePath("/approvals");
  return { success: true };
}
