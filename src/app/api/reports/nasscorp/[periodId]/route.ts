import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderReportPdf, type ReportPdfColumn } from "@/lib/report-pdf";
import { formatDate } from "@/lib/utils";

const COLUMNS: ReportPdfColumn[] = [
  { key: "employee_number", label: "Employee #", width: 0.8 },
  { key: "employee_name", label: "Employee", width: 1.4 },
  { key: "nasscorp_number", label: "NASSCORP #", width: 1 },
  { key: "employee_nasscorp", label: "Employee (4%)", align: "right", width: 1 },
  { key: "employer_nasscorp", label: "Employer (6%)", align: "right", width: 1 },
  { key: "total_nasscorp", label: "Total NASSCORP", align: "right", width: 1 },
  { key: "income_tax", label: "Income Tax (WHT)", align: "right", width: 1 },
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ periodId: string }> }) {
  const { periodId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("period_label, company_id")
    .eq("id", periodId)
    .maybeSingle();
  if (periodError || !period) {
    return NextResponse.json({ error: "Payroll period not found" }, { status: 404 });
  }

  const { data: company } = await supabase.from("companies").select("name, currency").eq("id", period.company_id).maybeSingle();

  const { data: items } = await supabase
    .from("payroll_items")
    .select("employee_nasscorp, employer_nasscorp, income_tax, employees(first_name, last_name, employee_number, nasscorp_number)")
    .eq("payroll_period_id", periodId)
    .order("created_at");

  let totalEmployee = 0;
  let totalEmployer = 0;
  let totalTax = 0;

  const rows = (items ?? []).map((item) => {
    const emp = item.employees as unknown as {
      first_name: string;
      last_name: string;
      employee_number: string;
      nasscorp_number: string | null;
    } | null;
    const employeeNasscorp = Number(item.employee_nasscorp);
    const employerNasscorp = Number(item.employer_nasscorp);
    const incomeTax = Number(item.income_tax);
    totalEmployee += employeeNasscorp;
    totalEmployer += employerNasscorp;
    totalTax += incomeTax;

    return {
      employee_number: emp?.employee_number ?? "—",
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "—",
      nasscorp_number: emp?.nasscorp_number ?? "—",
      employee_nasscorp: employeeNasscorp.toFixed(2),
      employer_nasscorp: employerNasscorp.toFixed(2),
      total_nasscorp: (employeeNasscorp + employerNasscorp).toFixed(2),
      income_tax: incomeTax.toFixed(2),
    };
  });

  const pdfBuffer = await renderReportPdf({
    title: "NASSCORP & Tax Remittance",
    subtitle: period.period_label,
    companyName: company?.name ?? "LIBSA Consultancy",
    generatedAt: formatDate(new Date().toISOString()),
    columns: COLUMNS,
    rows,
    totalsRow: {
      employee_number: "",
      employee_name: "",
      nasscorp_number: "Totals",
      employee_nasscorp: totalEmployee.toFixed(2),
      employer_nasscorp: totalEmployer.toFixed(2),
      total_nasscorp: (totalEmployee + totalEmployer).toFixed(2),
      income_tax: totalTax.toFixed(2),
    },
  });

  const download = request.nextUrl.searchParams.get("download") === "1";
  const filename = `nasscorp-remittance-${period.period_label.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
