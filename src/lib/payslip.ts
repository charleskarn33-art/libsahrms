import "server-only";

export function buildPayslipNumber(companySlug: string, periodStart: string, employeeNumber: string) {
  const [year, month] = periodStart.split("-");
  return `${companySlug.toUpperCase()}-${year}${month}-${employeeNumber}`.replace(/\s+/g, "-");
}

export function buildVerificationUrl(payslipId: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${base}/verify/${payslipId}`;
}
