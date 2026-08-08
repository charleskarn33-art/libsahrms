import "server-only";
import QRCode from "qrcode";

export function buildPayslipNumber(companySlug: string, periodStart: string, employeeNumber: string) {
  const [year, month] = periodStart.split("-");
  return `${companySlug.toUpperCase()}-${year}${month}-${employeeNumber}`.replace(/\s+/g, "-");
}

export function buildQrCodeData(payslipNumber: string, companyName: string) {
  return `${companyName} | Payslip ${payslipNumber}`;
}

export async function qrCodeDataUri(data: string): Promise<string> {
  return QRCode.toDataURL(data, { margin: 1, width: 160 });
}
