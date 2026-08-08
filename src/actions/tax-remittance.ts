"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { logAudit } from "@/lib/audit";
import { taxRemittanceSchema } from "@/lib/validations/tax-remittance";

export type ActionResult = { success: true } | { success: false; error: string };

export async function recordTaxRemittance(input: unknown): Promise<ActionResult> {
  const parsed = taxRemittanceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("tax_remittances").upsert(
    {
      company_id: companyId,
      payroll_period_id: parsed.data.payroll_period_id,
      status: "paid",
      payment_date: parsed.data.payment_date,
      receipt_reference: parsed.data.receipt_reference,
      notes: parsed.data.notes || null,
      recorded_by: user?.id ?? null,
    },
    { onConflict: "company_id,payroll_period_id" }
  );

  if (error) return { success: false, error: error.message };

  await logAudit({
    action: "tax_remittance_recorded",
    entityType: "payroll_period",
    entityId: parsed.data.payroll_period_id,
    companyId,
    metadata: { receipt_reference: parsed.data.receipt_reference },
  });
  revalidatePath("/nasscorp");
  return { success: true };
}
