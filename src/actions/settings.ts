"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { companySettingsSchema } from "@/lib/validations/settings";

export type ActionResult = { success: true } | { success: false; error: string };

export async function updateCompanySettings(id: string, input: unknown): Promise<ActionResult> {
  const parsed = companySettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    address: parsed.data.address || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    tin: parsed.data.tin || null,
    nasscorp_employer_number: parsed.data.nasscorp_employer_number || null,
  };

  const { error } = await supabase.from("company_settings").update(payload).eq("id", id);
  if (error) return { success: false, error: error.message };

  await logAudit({ action: "company_settings_updated", entityType: "company_settings", entityId: id });
  revalidatePath("/settings");
  return { success: true };
}
