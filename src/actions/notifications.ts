"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { success: true } | { success: false; error: string };

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("profile_id", user.id).eq("is_read", false);
  if (error) return { success: false, error: error.message };

  revalidatePath("/notifications");
  return { success: true };
}
