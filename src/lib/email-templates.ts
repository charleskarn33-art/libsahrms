import "server-only";

export function payslipEmailSubject(periodLabel: string) {
  return `LIBSA Payroll Payslip - ${periodLabel}`;
}

export function payslipEmailHtml(params: {
  employeeName: string;
  periodLabel: string;
  netSalary: string;
  paymentDate: string | null;
  companyName: string;
}) {
  const { employeeName, periodLabel, netSalary, paymentDate, companyName } = params;

  return `
  <div style="font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0F172A;">
    <div style="background: linear-gradient(135deg, #0057FF 0%, #6C5CE7 100%); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; opacity: 0.85; letter-spacing: 0.5px;">${companyName.toUpperCase()}</p>
      <p style="margin: 8px 0 0; font-size: 20px; font-weight: 700;">Payslip Ready — ${periodLabel}</p>
    </div>

    <p>Dear ${employeeName},</p>
    <p>Your salary has been processed successfully. Your payslip for <strong>${periodLabel}</strong> is attached to this email as a PDF.</p>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
      <tr style="background: #F8FAFC;">
        <td style="padding: 12px 16px; color: #64748B; font-size: 13px;">Payroll Month</td>
        <td style="padding: 12px 16px; text-align: right; font-weight: 600; font-size: 13px;">${periodLabel}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; color: #64748B; font-size: 13px;">Payment Date</td>
        <td style="padding: 12px 16px; text-align: right; font-weight: 600; font-size: 13px;">${paymentDate ?? "—"}</td>
      </tr>
      <tr style="background: #EEF3FF;">
        <td style="padding: 12px 16px; color: #0057FF; font-size: 14px; font-weight: 700;">Net Salary</td>
        <td style="padding: 12px 16px; text-align: right; color: #0057FF; font-size: 16px; font-weight: 700;">${netSalary}</td>
      </tr>
    </table>

    <p>Thank you.</p>
    <p style="margin-top: 24px;">
      Human Resource Department<br />
      ${companyName}
    </p>

    <p style="margin-top: 32px; font-size: 11px; color: #94A3B8;">
      This email and its attachment contain confidential information intended only for you. If you received this in error, please delete it and notify HR.
    </p>
  </div>`;
}
