"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { logAudit } from "@/lib/audit";
import { holidaySchema } from "@/lib/validations/holiday";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createHoliday(input: unknown): Promise<ActionResult> {
  const parsed = holidaySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { success: false, error: "No company selected" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("public_holidays")
    .insert({ ...parsed.data, company_id: companyId, created_by: user?.id ?? null })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "holiday_created", entityType: "public_holiday", entityId: data.id, companyId });
  revalidatePath("/leave/holidays");
  revalidatePath("/leave/calendar");
  return { success: true };
}

export async function deleteHoliday(id: string): Promise<ActionResult> {
  const companyId = await getCurrentCompanyId();
  const supabase = await createClient();
  const { error } = await supabase.from("public_holidays").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  await logAudit({ action: "holiday_deleted", entityType: "public_holiday", entityId: id, companyId });
  revalidatePath("/leave/holidays");
  revalidatePath("/leave/calendar");
  return { success: true };
}
