import "server-only";

export function buildPayslipNumber(companySlug: string, periodStart: string, employeeNumber: string) {
  const [year, month] = periodStart.split("-");
  return `${companySlug.toUpperCase()}-${year}${month}-${employeeNumber}`.replace(/\s+/g, "-");
}

export function buildQrCodeData(payslipNumber: string, companyName: string) {
  return `${companyName} | Payslip ${payslipNumber}`;
}
