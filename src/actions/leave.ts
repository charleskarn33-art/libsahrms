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

export async function requestLeave(input: unknown): Promise<ActionResult> {
  const parsed = leaveRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: employee } = await supabase.from("employees").select("id, company_id").eq("profile_id", user.id).single();
  if (!employee) return { success: false, error: "No employee record linked to this account" };

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      employee_id: employee.id,
      company_id: employee.company_id,
      leave_type: parsed.data.leave_type,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      days_requested: daysBetween(parsed.data.start_date, parsed.data.end_date),
      reason: parsed.data.reason || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "leave_requested", entityType: "leave_request", entityId: data.id, companyId: employee.company_id });
  revalidatePath("/leave");
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
    const year = new Date().getFullYear();
    const { data: balance } = await supabase
      .from("leave_balances")
      .select("id, used_days")
      .eq("employee_id", leaveRequest.employee_id)
      .eq("leave_type", leaveRequest.leave_type)
      .eq("year", year)
      .maybeSingle();

    if (balance) {
      await supabase
        .from("leave_balances")
        .update({ used_days: Number(balance.used_days) + Number(leaveRequest.days_requested) })
        .eq("id", balance.id);
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("profile_id")
      .eq("id", leaveRequest.employee_id)
      .single();

    if (employee?.profile_id) {
      await supabase.from("notifications").insert({
        profile_id: employee.profile_id,
        type: "leave_approved",
        title: "Leave request approved",
        message: `Your ${leaveRequest.leave_type} leave request has been approved.`,
        link: "/leave",
      });
    }
  }

  await logAudit({ action: `leave_${decision}`, entityType: "leave_request", entityId: id, companyId: leaveRequest?.company_id });
  revalidatePath("/leave");
  revalidatePath("/approvals");
  return { success: true };
}
