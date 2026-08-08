"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { logAudit } from "@/lib/audit";
import {
  benefitProviderSchema,
  benefitPlanSchema,
  benefitEnrollmentSchema,
  benefitDependentSchema,
  benefitClaimSchema,
  claimReviewSchema,
} from "@/lib/validations/benefits";

export type ActionResult = { success: true } | { success: false; error: string };

function generateClaimNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CLM-${date}-${suffix}`;
}

export async function createBenefitProvider(input: unknown): Promise<ActionResult> {
  const parsed = benefitProviderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("benefit_providers")
    .insert({
      company_id: companyId,
      name: parsed.data.name,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "benefit_provider_created", entityType: "benefit_provider", entityId: data.id, companyId });
  revalidatePath("/benefits/providers");
  revalidatePath("/benefits/plans");
  return { success: true };
}

export async function createBenefitPlan(input: unknown): Promise<ActionResult> {
  const parsed = benefitPlanSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("benefit_plans")
    .insert({
      company_id: companyId,
      name: parsed.data.name,
      category: parsed.data.category,
      provider_id: parsed.data.provider_id || null,
      description: parsed.data.description || null,
      company_contribution: parsed.data.company_contribution,
      employee_contribution: parsed.data.employee_contribution,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "benefit_plan_created", entityType: "benefit_plan", entityId: data.id, companyId });
  revalidatePath("/benefits");
  revalidatePath("/benefits/plans");
  return { success: true };
}

export async function toggleBenefitPlanStatus(planId: string, status: "active" | "inactive"): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("benefit_plans").update({ status }).eq("id", planId).select("company_id").single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "benefit_plan_status_changed", entityType: "benefit_plan", entityId: planId, companyId: data.company_id, metadata: { status } });
  revalidatePath("/benefits");
  revalidatePath("/benefits/plans");
  return { success: true };
}

export async function enrollEmployee(input: unknown): Promise<ActionResult> {
  const parsed = benefitEnrollmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("benefit_enrollments")
    .insert({
      company_id: companyId,
      employee_id: parsed.data.employee_id,
      benefit_plan_id: parsed.data.benefit_plan_id,
      coverage_start_date: parsed.data.coverage_start_date,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "benefit_enrollment_created", entityType: "benefit_enrollment", entityId: data.id, companyId });
  revalidatePath("/benefits");
  revalidatePath("/benefits/enrollments");
  return { success: true };
}

export async function cancelEnrollment(enrollmentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("benefit_enrollments")
    .update({ status: "cancelled" })
    .eq("id", enrollmentId)
    .select("company_id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "benefit_enrollment_cancelled", entityType: "benefit_enrollment", entityId: enrollmentId, companyId: data.company_id });
  revalidatePath("/benefits");
  revalidatePath("/benefits/enrollments");
  return { success: true };
}

export async function addDependent(input: unknown): Promise<ActionResult> {
  const parsed = benefitDependentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: enrollment } = await supabase.from("benefit_enrollments").select("company_id").eq("id", parsed.data.enrollment_id).maybeSingle();
  if (!enrollment) return { success: false, error: "Enrollment not found" };

  const { data, error } = await supabase
    .from("benefit_dependents")
    .insert({
      enrollment_id: parsed.data.enrollment_id,
      full_name: parsed.data.full_name,
      relationship: parsed.data.relationship,
      date_of_birth: parsed.data.date_of_birth || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "benefit_dependent_added", entityType: "benefit_dependent", entityId: data.id, companyId: enrollment.company_id });
  revalidatePath("/benefits/dependents");
  return { success: true };
}

export async function submitClaim(input: unknown): Promise<ActionResult> {
  const parsed = benefitClaimSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("benefit_claims")
    .insert({
      company_id: companyId,
      employee_id: parsed.data.employee_id,
      benefit_plan_id: parsed.data.benefit_plan_id,
      claim_number: generateClaimNumber(),
      description: parsed.data.description || null,
      amount_claimed: parsed.data.amount_claimed,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "benefit_claim_submitted", entityType: "benefit_claim", entityId: data.id, companyId });
  revalidatePath("/benefits");
  revalidatePath("/benefits/claims");
  return { success: true };
}

export async function reviewClaim(input: unknown): Promise<ActionResult> {
  const parsed = claimReviewSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("benefit_claims")
    .update({
      status: parsed.data.decision,
      amount_approved: parsed.data.decision === "approved" ? parsed.data.amount_approved ?? null : null,
      review_notes: parsed.data.review_notes || null,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.claim_id)
    .eq("status", "pending")
    .select("company_id")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Claim has already been reviewed" };

  await logAudit({ action: `benefit_claim_${parsed.data.decision}`, entityType: "benefit_claim", entityId: parsed.data.claim_id, companyId: data.company_id });
  revalidatePath("/benefits");
  revalidatePath("/benefits/claims");
  return { success: true };
}
