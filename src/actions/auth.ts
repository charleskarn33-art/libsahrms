"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";

export type ActionResult = { success: true } | { success: false; error: string };

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: "Invalid email or password" };
  }

  await supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
  await supabase.from("audit_logs").insert({
    actor_id: data.user.id,
    actor_email: data.user.email,
    action: "login",
    entity_type: "auth",
  });

  return { success: true };
}

export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      actor_email: user.email,
      action: "logout",
      entity_type: "auth",
    });
  }

  await supabase.auth.signOut();
  return { success: true };
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  // Always report success to avoid leaking which emails are registered.
  if (error) {
    console.error("resetPasswordForEmail error", error.message);
  }
  return { success: true };
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
