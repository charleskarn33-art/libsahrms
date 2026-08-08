import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderReportPdf, type ReportPdfColumn } from "@/lib/report-pdf";
import { formatDate } from "@/lib/utils";

const COLUMNS: ReportPdfColumn[] = [
  { key: "employee_number", label: "Employee #", width: 0.8 },
  { key: "employee_name", label: "Employee", width: 1.4 },
  { key: "payment_method", label: "Method", width: 0.9 },
  { key: "bank_name", label: "Bank", width: 1.1 },
  { key: "account_number", label: "Account / Orange Money #", width: 1.2 },
  { key: "net_salary", label: "Net Pay", align: "right", width: 1 },
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
    .select(
      "net_salary, employees(first_name, last_name, employee_number, payment_method, bank_name, bank_account_number, orange_money_number)"
    )
    .eq("payroll_period_id", periodId)
    .order("created_at");

  let totalNet = 0;

  const rows = (items ?? []).map((item) => {
    const emp = item.employees as unknown as {
      first_name: string;
      last_name: string;
      employee_number: string;
      payment_method: string;
      bank_name: string | null;
      bank_account_number: string | null;
      orange_money_number: string | null;
    } | null;
    const netSalary = Number(item.net_salary);
    totalNet += netSalary;
    const isOrangeMoney = emp?.payment_method === "orange_money";

    return {
      employee_number: emp?.employee_number ?? "—",
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "—",
      payment_method: (emp?.payment_method ?? "—").replace("_", " "),
      bank_name: isOrangeMoney ? "—" : emp?.bank_name ?? "—",
      account_number: isOrangeMoney ? emp?.orange_money_number ?? "—" : emp?.bank_account_number ?? "—",
      net_salary: netSalary.toFixed(2),
    };
  });

  const pdfBuffer = await renderReportPdf({
    title: "Bank & Orange Money Transfer Report",
    subtitle: period.period_label,
    companyName: company?.name ?? "LIBSA Consultancy",
    generatedAt: formatDate(new Date().toISOString()),
    columns: COLUMNS,
    rows,
    totalsRow: {
      employee_number: "",
      employee_name: "",
      payment_method: "",
      bank_name: "",
      account_number: "Total",
      net_salary: totalNet.toFixed(2),
    },
  });

  const download = request.nextUrl.searchParams.get("download") === "1";
  const filename = `payments-${period.period_label.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
