"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { logAudit } from "@/lib/audit";
import { payrollPeriodSchema } from "@/lib/validations/payroll";

export type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

export async function createPayrollPeriod(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = payrollPeriodSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("payroll_periods")
    .insert({
      company_id: companyId,
      period_label: parsed.data.period_label,
      frequency: parsed.data.frequency,
      period_start: parsed.data.period_start,
      period_end: parsed.data.period_end,
      payment_date: parsed.data.payment_date || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "payroll_period_created", entityType: "payroll_period", entityId: data.id, companyId });
  revalidatePath("/payroll/periods");
  revalidatePath("/payroll");
  return { success: true, data: { id: data.id } };
}

export async function generatePayroll(periodId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: rpcError } = await supabase.rpc("generate_payroll_items", { p_payroll_period_id: periodId });
  if (rpcError) return { success: false, error: rpcError.message };

  const { data: period, error } = await supabase
    .from("payroll_periods")
    .update({
      status: "pending",
      approval_stage: "finance_review",
      hr_prepared_by: user?.id ?? null,
      hr_prepared_at: new Date().toISOString(),
    })
    .eq("id", periodId)
    .select("company_id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "payroll_generated", entityType: "payroll_period", entityId: periodId, companyId: period?.company_id });
  revalidatePath("/payroll/periods");
  revalidatePath("/payroll");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function financeReview(periodId: string, decision: "approved" | "rejected"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: period, error } = await supabase
    .from("payroll_periods")
    .update({
      finance_decision: decision,
      finance_reviewed_by: user?.id ?? null,
      finance_reviewed_at: new Date().toISOString(),
      approval_stage: decision === "approved" ? "director_approval" : "hr_preparation",
      status: decision === "approved" ? "pending" : "draft",
    })
    .eq("id", periodId)
    .select("company_id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: `payroll_finance_${decision}`, entityType: "payroll_period", entityId: periodId, companyId: period?.company_id });
  revalidatePath("/payroll/periods");
  revalidatePath("/payroll");
  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function directorApproval(periodId: string, decision: "approved" | "rejected"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: period, error } = await supabase
    .from("payroll_periods")
    .update({
      director_decision: decision,
      director_approved_by: user?.id ?? null,
      director_approved_at: new Date().toISOString(),
      approval_stage: decision === "approved" ? "payroll_locked" : "finance_review",
      status: decision === "approved" ? "approved" : "pending",
    })
    .eq("id", periodId)
    .select("company_id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: `payroll_director_${decision}`, entityType: "payroll_period", entityId: periodId, companyId: period?.company_id });
  revalidatePath("/payroll/periods");
  revalidatePath("/payroll");
  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function lockPayroll(periodId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: period, error } = await supabase
    .from("payroll_periods")
    .update({ status: "locked", locked_by: user?.id ?? null, locked_at: new Date().toISOString() })
    .eq("id", periodId)
    .select("company_id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "payroll_locked", entityType: "payroll_period", entityId: periodId, companyId: period?.company_id });
  revalidatePath("/payroll/periods");
  revalidatePath("/payroll");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function unlockPayroll(periodId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: period, error } = await supabase
    .from("payroll_periods")
    .update({
      status: "draft",
      approval_stage: "hr_preparation",
      unlocked_by: user?.id ?? null,
      unlocked_at: new Date().toISOString(),
    })
    .eq("id", periodId)
    .select("company_id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "payroll_unlocked", entityType: "payroll_period", entityId: periodId, companyId: period?.company_id });
  revalidatePath("/payroll/periods");
  revalidatePath("/payroll");
  return { success: true };
}
