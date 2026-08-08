import "server-only";
import nodemailer from "nodemailer";
import { getResendClient, getResendFromAddress } from "@/lib/resend";

export type MailProvider = "resend" | "gmail" | null;

/**
 * Resend wins whenever it's configured, so adding RESEND_API_KEY later
 * (once a sending domain is verified) switches providers with no code change.
 */
export function getConfiguredMailProvider(): MailProvider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return "gmail";
  return null;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  attachments: { filename: string; content: Buffer }[];
}

export type SendMailResult = { success: true; providerMessageId: string | null } | { success: false; error: string };

async function sendViaResend(input: SendMailInput): Promise<SendMailResult> {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Resend is not configured" };

  try {
    const { data, error } = await resend.emails.send({
      from: getResendFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, providerMessageId: data?.id ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email via Resend";
    return { success: false, error: message };
  }
}

async function sendViaGmail(input: SendMailInput): Promise<SendMailResult> {
  const user = process.env.GMAIL_USER!;
  const pass = process.env.GMAIL_APP_PASSWORD!;
  const fromName = process.env.GMAIL_FROM_NAME || "LIBSA Payroll";

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  try {
    const info = await transport.sendMail({
      from: `${fromName} <${user}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
    });
    return { success: true, providerMessageId: info.messageId ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email via Gmail";
    return { success: false, error: message };
  }
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const provider = getConfiguredMailProvider();
  if (provider === "resend") return sendViaResend(input);
  if (provider === "gmail") return sendViaGmail(input);
  return {
    success: false,
    error: "Email delivery isn't configured yet — set RESEND_API_KEY, or GMAIL_USER/GMAIL_APP_PASSWORD, to enable sending.",
  };
}
