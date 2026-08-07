"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type ActionResult = { success: true } | { success: false; error: string };

export async function clockIn(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: employee } = await supabase.from("employees").select("id").eq("profile_id", user.id).single();
  if (!employee) return { success: false, error: "No employee record linked to this account" };

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);

  const { error } = await supabase.from("attendance_records").upsert(
    {
      employee_id: employee.id,
      work_date: today,
      clock_in: now.toISOString(),
      status: isLate ? "late" : "present",
    },
    { onConflict: "employee_id,work_date" }
  );

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "clock_in", entityType: "attendance", entityId: employee.id });
  revalidatePath("/attendance");
  return { success: true };
}

export async function clockOut(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: employee } = await supabase.from("employees").select("id").eq("profile_id", user.id).single();
  if (!employee) return { success: false, error: "No employee record linked to this account" };

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("attendance_records")
    .update({ clock_out: new Date().toISOString() })
    .eq("employee_id", employee.id)
    .eq("work_date", today);

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "clock_out", entityType: "attendance", entityId: employee.id });
  revalidatePath("/attendance");
  return { success: true };
}
