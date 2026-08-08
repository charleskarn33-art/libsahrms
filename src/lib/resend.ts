import "server-only";
import { Resend } from "resend";

export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export function getResendFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "LIBSA Payroll <payroll@libsaconsultancy.com>";
}
