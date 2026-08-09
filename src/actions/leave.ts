"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { leaveRequestSchema } from "@/lib/validations/leave";

export type ActionResult = { success: true } | { success: false; error: string };

function daysBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

/** Deducts the approved days from the employee's balance and notifies them. Shared by HR review and HR direct-set. */
async function applyLeaveApprovalEffects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: { employeeId: string; leaveType: string; daysRequested: number; message: string }
) {
  const year = new Date().getFullYear();
  const { data: balance } = await supabase
    .from("leave_balances")
    .select("id, used_days")
    .eq("employee_id", params.employeeId)
    .eq("leave_type", params.leaveType)
    .eq("year", year)
    .maybeSingle();

  if (balance) {
    await supabase
      .from("leave_balances")
      .update({ used_days: Number(balance.used_days) + params.daysRequested })
      .eq("id", balance.id);
  }

  const { data: employee } = await supabase.from("employees").select("profile_id").eq("id", params.employeeId).single();

  if (employee?.profile_id) {
    await supabase.from("notifications").insert({
      profile_id: employee.profile_id,
      type: "leave_approved",
      title: "Leave request approved",
      message: params.message,
      link: "/leave",
    });
  }
}

export async function requestLeave(input: unknown): Promise<ActionResult> {
  const parsed = leaveRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Explicit employee_id means HR is recording leave on someone's behalf — the
  // leave_requests_self_insert RLS policy only allows this for HR/Admin, so a
  // non-HR caller gets rejected at the database regardless of what the UI shows.
  const settingForOther = !!parsed.data.employee_id;

  const { data: employee } = settingForOther
    ? await supabase.from("employees").select("id, company_id").eq("id", parsed.data.employee_id!).single()
    : await supabase.from("employees").select("id, company_id").eq("profile_id", user.id).single();

  if (!employee) return { success: false, error: "Employee not found" };

  const daysRequested = daysBetween(parsed.data.start_date, parsed.data.end_date);

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      employee_id: employee.id,
      company_id: employee.company_id,
      leave_type: parsed.data.leave_type,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      days_requested: daysRequested,
      reason: parsed.data.reason || null,
      ...(settingForOther ? { status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() } : {}),
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  if (settingForOther) {
    await applyLeaveApprovalEffects(supabase, {
      employeeId: employee.id,
      leaveType: parsed.data.leave_type,
      daysRequested,
      message: `HR recorded ${daysRequested} day(s) of ${parsed.data.leave_type} leave for you.`,
    });
  }

  await logAudit({
    action: settingForOther ? "leave_set_by_hr" : "leave_requested",
    entityType: "leave_request",
    entityId: data.id,
    companyId: employee.company_id,
  });
  revalidatePath("/leave");
  revalidatePath("/leave/balance");
  return { success: true };
}

export async function reviewLeaveRequest(id: string, decision: "approved" | "rejected"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: leaveRequest, error } = await supabase
    .from("leave_requests")
    .update({
      status: decision,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("employee_id, leave_type, days_requested, company_id")
    .single();

  if (error) return { success: false, error: error.message };

  if (decision === "approved" && leaveRequest) {
    await applyLeaveApprovalEffects(supabase, {
      employeeId: leaveRequest.employee_id,
      leaveType: leaveRequest.leave_type,
      daysRequested: Number(leaveRequest.days_requested),
      message: `Your ${leaveRequest.leave_type} leave request has been approved.`,
    });
  }

  await logAudit({ action: `leave_${decision}`, entityType: "leave_request", entityId: id, companyId: leaveRequest?.company_id });
  revalidatePath("/leave");
  revalidatePath("/approvals");
  return { success: true };
}
