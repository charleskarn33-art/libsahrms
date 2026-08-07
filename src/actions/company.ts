"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CURRENT_COMPANY_COOKIE } from "@/lib/constants";

export type ActionResult = { success: true } | { success: false; error: string };

export async function setCurrentCompany(companyId: string): Promise<ActionResult> {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_COMPANY_COOKIE, companyId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return { success: true };
}
