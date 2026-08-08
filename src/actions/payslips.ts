"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { buildPayslipNumber, buildQrCodeData } from "@/lib/payslip";
import { renderPayslipPdf, type PayslipPdfData } from "@/lib/payslip-pdf";
import { payslipEmailSubject, payslipEmailHtml } from "@/lib/email-templates";
import { getResendClient, getResendFromAddress } from "@/lib/resend";
import { formatCurrency, formatDate } from "@/lib/utils";

export type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

type PayrollItemForPayslip = {
  id: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  relocation_allowance: number;
  bonus: number;
  commission: number;
  overtime_pay: number;
  gross_salary: number;
  employee_nasscorp: number;
  employer_nasscorp: number;
  income_tax: number;
  loan_deductions: number;
  other_deductions: number;
  orange_money_fee: number;
  total_deductions: number;
  net_salary: number;
  employee_id: string;
  employees: {
    first_name: string;
    last_name: string;
    employee_number: string;
    email: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    orange_money_number: string | null;
    payment_method: string;
    departments: { name: string } | null;
    positions: { title: string } | null;
  } | null;
};

export async function generatePayslips(periodId: string): Promise<ActionResult<{ generated: number; skipped: number }>> {
  const supabase = await createClient();

  const { data: period, error: periodError } = await supabase.from("payroll_periods").select("*").eq("id", periodId).single();
  if (periodError || !period) return { success: false, error: "Payroll period not found or not accessible" };

  if (period.status !== "locked") {
    return { success: false, error: "Payroll must be locked before payslips can be generated" };
  }
  if (period.approval_stage !== "payroll_locked") {
    return { success: false, error: "Payslips have already been generated for this period" };
  }

  const { data: company } = await supabase.from("companies").select("*").eq("id", period.company_id).single();
  if (!company) return { success: false, error: "Company not found" };

  const { data: items, error: itemsError } = await supabase
    .from("payroll_items")
    .select(
      `id, basic_salary, housing_allowance, transport_allowance, relocation_allowance, bonus, commission, overtime_pay,
       gross_salary, employee_nasscorp, employer_nasscorp, income_tax, loan_deductions, other_deductions, orange_money_fee,
       total_deductions, net_salary, employee_id,
       employees(first_name, last_name, employee_number, email, bank_name, bank_account_number, orange_money_number, payment_method,
         departments!department_id(name), positions(title))`
    )
    .eq("payroll_period_id", periodId);

  if (itemsError) return { success: false, error: itemsError.message };
  if (!items || items.length === 0) return { success: false, error: "No payroll items found for this period" };

  let generated = 0;
  let skipped = 0;

  for (const rawItem of items as unknown as PayrollItemForPayslip[]) {
    const emp = rawItem.employees;
    if (!emp) {
      skipped++;
      continue;
    }

    const { data: existing } = await supabase.from("payslips").select("id").eq("payroll_item_id", rawItem.id).maybeSingle();
    if (existing) {
      skipped++;
      continue;
    }

    const payslipNumber = buildPayslipNumber(company.slug, period.period_start, emp.employee_number);
    const qrCodeData = buildQrCodeData(payslipNumber, company.name);
    const fullName = `${emp.first_name} ${emp.last_name}`;

    const pdfData: PayslipPdfData = {
      payslipNumber,
      company: { name: company.name, address: company.address, logoUrl: company.logo_url },
      employee: {
        fullName,
        employeeNumber: emp.employee_number,
        department: emp.departments?.name ?? null,
        position: emp.positions?.title ?? null,
        bankName: emp.bank_name,
        bankAccountNumber: emp.bank_account_number,
        orangeMoneyNumber: emp.orange_money_number,
        paymentMethod: emp.payment_method,
      },
      period: { label: period.period_label, paymentDate: period.payment_date ? formatDate(period.payment_date) : null },
      currency: company.currency,
      earnings: {
        basicSalary: Number(rawItem.basic_salary),
        housingAllowance: Number(rawItem.housing_allowance),
        transportAllowance: Number(rawItem.transport_allowance),
        relocationAllowance: Number(rawItem.relocation_allowance),
        bonus: Number(rawItem.bonus),
        commission: Number(rawItem.commission),
        overtimePay: Number(rawItem.overtime_pay),
        grossSalary: Number(rawItem.gross_salary),
      },
      deductions: {
        employeeNasscorp: Number(rawItem.employee_nasscorp),
        incomeTax: Number(rawItem.income_tax),
        loanDeductions: Number(rawItem.loan_deductions),
        otherDeductions: Number(rawItem.other_deductions),
        orangeMoneyFee: Number(rawItem.orange_money_fee),
        totalDeductions: Number(rawItem.total_deductions),
      },
      employerNasscorp: Number(rawItem.employer_nasscorp),
      netSalary: Number(rawItem.net_salary),
      qrCodeData,
      generatedAt: formatDate(new Date().toISOString()),
    };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await renderPayslipPdf(pdfData);
    } catch {
      skipped++;
      continue;
    }

    const storagePath = `${rawItem.employee_id}/${payslipNumber}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("payslips")
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      skipped++;
      continue;
    }

    const { data: payslip, error: insertError } = await supabase
      .from("payslips")
      .insert({
        payslip_number: payslipNumber,
        payroll_item_id: rawItem.id,
        employee_id: rawItem.employee_id,
        payroll_period_id: periodId,
        company_id: period.company_id,
        storage_path: storagePath,
        qr_code_data: qrCodeData,
      })
      .select("id")
      .single();

    if (insertError || !payslip) {
      skipped++;
      continue;
    }

    if (emp.email) {
      await supabase.from("payslip_deliveries").insert({
        payslip_id: payslip.id,
        employee_id: rawItem.employee_id,
        company_id: period.company_id,
        recipient_email: emp.email,
        status: "queued",
      });
    } else {
      await supabase.from("payslip_deliveries").insert({
        payslip_id: payslip.id,
        employee_id: rawItem.employee_id,
        company_id: period.company_id,
        recipient_email: "",
        status: "failed",
        error_message: "Employee has no email on file",
      });
    }

    generated++;
  }

  await supabase.from("payroll_periods").update({ approval_stage: "payslips_sent" }).eq("id", periodId);

  await logAudit({
    action: "payslips_generated",
    entityType: "payroll_period",
    entityId: periodId,
    companyId: period.company_id,
    metadata: { generated, skipped },
  });

  revalidatePath("/payroll/payslips");
  revalidatePath("/payroll");
  revalidatePath("/payroll/periods");
  return { success: true, data: { generated, skipped } };
}

async function sendOneDelivery(deliveryId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: "Email delivery isn't configured yet — set RESEND_API_KEY to enable sending." };
  }

  const { data: delivery, error: deliveryError } = await supabase
    .from("payslip_deliveries")
    .select("*, payslips(storage_path, payslip_number, payroll_period_id), employees(first_name, last_name)")
    .eq("id", deliveryId)
    .single();

  if (deliveryError || !delivery) return { success: false, error: "Delivery record not found" };
  if (!delivery.recipient_email) return { success: false, error: "No email address on file for this employee" };

  const payslipMeta = delivery.payslips as unknown as { storage_path: string; payslip_number: string; payroll_period_id: string } | null;
  const emp = delivery.employees as unknown as { first_name: string; last_name: string } | null;
  if (!payslipMeta) return { success: false, error: "Payslip not found" };

  const { data: period } = await supabase.from("payroll_periods").select("period_label, payment_date, company_id").eq("id", payslipMeta.payroll_period_id).single();
  const { data: company } = await supabase.from("companies").select("name, currency").eq("id", period?.company_id ?? "").single();
  const { data: payrollItem } = await supabase
    .from("payroll_items")
    .select("net_salary")
    .eq("payroll_period_id", payslipMeta.payroll_period_id)
    .eq("employee_id", delivery.employee_id)
    .single();

  const { data: fileBlob, error: downloadError } = await supabase.storage.from("payslips").download(payslipMeta.storage_path);
  if (downloadError || !fileBlob) {
    await supabase
      .from("payslip_deliveries")
      .update({ status: "failed", error_message: "Could not read the generated PDF", attempt_count: (delivery.attempt_count ?? 0) + 1 })
      .eq("id", deliveryId);
    return { success: false, error: "Could not read the generated payslip PDF" };
  }

  const pdfBuffer = Buffer.from(await fileBlob.arrayBuffer());
  const periodLabel = period?.period_label ?? "Payroll";
  const companyName = company?.name ?? "LIBSA Consultancy";
  const netSalary = formatCurrency(Number(payrollItem?.net_salary ?? 0), company?.currency ?? "LRD");

  try {
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: getResendFromAddress(),
      to: delivery.recipient_email,
      subject: payslipEmailSubject(periodLabel),
      html: payslipEmailHtml({
        employeeName: emp ? `${emp.first_name} ${emp.last_name}` : "Employee",
        periodLabel,
        netSalary,
        paymentDate: period?.payment_date ? formatDate(period.payment_date) : null,
        companyName,
      }),
      attachments: [{ filename: `${payslipMeta.payslip_number}.pdf`, content: pdfBuffer }],
    });

    if (sendError) {
      await supabase
        .from("payslip_deliveries")
        .update({ status: "failed", error_message: sendError.message, attempt_count: (delivery.attempt_count ?? 0) + 1 })
        .eq("id", deliveryId);
      return { success: false, error: sendError.message };
    }

    await supabase
      .from("payslip_deliveries")
      .update({
        status: "sent",
        provider_message_id: sendResult?.id ?? null,
        sent_at: new Date().toISOString(),
        error_message: null,
        attempt_count: (delivery.attempt_count ?? 0) + 1,
      })
      .eq("id", deliveryId);

    await logAudit({
      action: "payslip_emailed",
      entityType: "payslip_delivery",
      entityId: deliveryId,
      companyId: period?.company_id,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    await supabase
      .from("payslip_deliveries")
      .update({ status: "failed", error_message: message, attempt_count: (delivery.attempt_count ?? 0) + 1 })
      .eq("id", deliveryId);
    return { success: false, error: message };
  }
}

export async function sendPayslipDelivery(deliveryId: string): Promise<ActionResult> {
  const result = await sendOneDelivery(deliveryId);
  revalidatePath("/payroll/payslips");
  return result;
}

export async function sendAllPayslips(periodId: string): Promise<ActionResult<{ sent: number; failed: number }>> {
  const supabase = await createClient();
  const { data: deliveries } = await supabase
    .from("payslip_deliveries")
    .select("id, payslips!inner(payroll_period_id)")
    .eq("payslips.payroll_period_id", periodId)
    .in("status", ["queued"]);

  let sent = 0;
  let failed = 0;
  for (const d of deliveries ?? []) {
    const result = await sendOneDelivery(d.id);
    if (result.success) sent++;
    else failed++;
  }

  revalidatePath("/payroll/payslips");
  return { success: true, data: { sent, failed } };
}

export async function retryFailedPayslips(periodId: string): Promise<ActionResult<{ sent: number; failed: number }>> {
  const supabase = await createClient();
  const { data: deliveries } = await supabase
    .from("payslip_deliveries")
    .select("id, payslips!inner(payroll_period_id)")
    .eq("payslips.payroll_period_id", periodId)
    .eq("status", "failed");

  let sent = 0;
  let failed = 0;
  for (const d of deliveries ?? []) {
    const result = await sendOneDelivery(d.id);
    if (result.success) sent++;
    else failed++;
  }

  revalidatePath("/payroll/payslips");
  return { success: true, data: { sent, failed } };
}

export async function markPaymentsProcessed(periodId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: period, error } = await supabase
    .from("payroll_periods")
    .update({ status: "paid", approval_stage: "payments_processed" })
    .eq("id", periodId)
    .eq("approval_stage", "payslips_sent")
    .select("company_id")
    .single();

  if (error || !period) return { success: false, error: "Payroll must have payslips generated before it can be marked as paid" };

  await logAudit({ action: "payroll_payments_processed", entityType: "payroll_period", entityId: periodId, companyId: period.company_id });
  revalidatePath("/payroll");
  revalidatePath("/payroll/periods");
  revalidatePath("/payroll/payslips");
  return { success: true };
}
