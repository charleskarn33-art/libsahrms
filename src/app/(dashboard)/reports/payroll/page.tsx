import Link from "next/link";
import { ArrowLeft, Users, Wallet, ReceiptText, PiggyBank } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalaryTrendChart } from "@/components/dashboard/salary-trend-chart";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PayrollStatus } from "@/types/database";

const STATUS_VARIANT: Record<PayrollStatus, "success" | "warning" | "default" | "danger" | "outline"> = {
  paid: "success",
  approved: "success",
  locked: "default",
  pending: "warning",
  draft: "outline",
  cancelled: "danger",
};

interface PayrollReportRow {
  period_label: string;
  period_start: string;
  period_end: string;
  status: PayrollStatus;
  employee_count: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_employee_nasscorp: number;
  total_employer_nasscorp: number;
  total_income_tax: number;
}

const COLUMNS: { key: keyof PayrollReportRow; label: string }[] = [
  { key: "period_label", label: "Period" },
  { key: "period_start", label: "Start" },
  { key: "period_end", label: "End" },
  { key: "status", label: "Status" },
  { key: "employee_count", label: "Employees" },
  { key: "total_gross", label: "Gross Pay" },
  { key: "total_deductions", label: "Deductions" },
  { key: "total_net", label: "Net Pay" },
  { key: "total_employee_nasscorp", label: "NASSCORP (Employee)" },
  { key: "total_employer_nasscorp", label: "NASSCORP (Employer)" },
  { key: "total_income_tax", label: "Income Tax" },
];

export default async function PayrollSummaryReportPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const { data: periods } = await supabase
    .from("payroll_periods")
    .select("id, period_label, period_start, period_end, status")
    .eq("company_id", companyId ?? "")
    .order("period_start");

  const { data: summaries } = await supabase
    .from("v_payroll_period_summary")
    .select("*")
    .eq("company_id", companyId ?? "");

  const summaryMap = new Map((summaries ?? []).map((s) => [s.payroll_period_id, s]));

  const rows: PayrollReportRow[] = (periods ?? []).map((p) => {
    const s = summaryMap.get(p.id);
    const gross = Number(s?.total_gross ?? 0);
    const net = Number(s?.total_net ?? 0);
    return {
      period_label: p.period_label,
      period_start: formatDate(p.period_start),
      period_end: formatDate(p.period_end),
      status: p.status as PayrollStatus,
      employee_count: Number(s?.employee_count ?? 0),
      total_gross: gross,
      total_deductions: gross - net,
      total_net: net,
      total_employee_nasscorp: Number(s?.total_employee_nasscorp ?? 0),
      total_employer_nasscorp: Number(s?.total_employer_nasscorp ?? 0),
      total_income_tax: Number(s?.total_income_tax ?? 0),
    };
  });

  const ytdYear = new Date().getFullYear();
  const ytdRows = rows.filter((r) => new Date(r.period_start).getFullYear() === ytdYear);
  const ytdGross = ytdRows.reduce((sum, r) => sum + r.total_gross, 0);
  const ytdNet = ytdRows.reduce((sum, r) => sum + r.total_net, 0);
  const ytdNasscorp = ytdRows.reduce((sum, r) => sum + r.total_employee_nasscorp + r.total_employer_nasscorp, 0);

  const chartData = rows.slice(-12).map((r) => ({ month: r.period_label, total: r.total_net }));

  const exportRows = rows.map((r) => ({
    ...r,
    total_gross: r.total_gross.toFixed(2),
    total_deductions: r.total_deductions.toFixed(2),
    total_net: r.total_net.toFixed(2),
    total_employee_nasscorp: r.total_employee_nasscorp.toFixed(2),
    total_employer_nasscorp: r.total_employer_nasscorp.toFixed(2),
    total_income_tax: r.total_income_tax.toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/reports">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll Summary Report</h1>
          <p className="text-sm text-muted-foreground">Gross, net, and deductions across every payroll period.</p>
        </div>
        <ReportExportButtons filename="payroll-summary-report" rows={exportRows} columns={COLUMNS} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Payroll Periods" value={String(rows.length)} tone="primary" />
        <StatCard icon={Wallet} label={`YTD Gross (${ytdYear})`} value={formatCurrency(ytdGross)} tone="secondary" />
        <StatCard icon={ReceiptText} label={`YTD NASSCORP (${ytdYear})`} value={formatCurrency(ytdNasscorp)} tone="danger" />
        <StatCard icon={PiggyBank} label={`YTD Net (${ytdYear})`} value={formatCurrency(ytdNet)} tone="accent" />
      </div>

      {chartData.length > 0 && <SalaryTrendChart data={chartData} />}

      <Card>
        <CardHeader>
          <CardTitle>All Periods</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>NASSCORP (Emp.)</TableHead>
                <TableHead>NASSCORP (Employer)</TableHead>
                <TableHead>Income Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    No payroll periods yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.period_label}>
                  <TableCell>
                    <p className="font-medium leading-tight">{r.period_label}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.period_start} – {r.period_end}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.employee_count}</TableCell>
                  <TableCell>{formatCurrency(r.total_gross)}</TableCell>
                  <TableCell>{formatCurrency(r.total_deductions)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(r.total_net)}</TableCell>
                  <TableCell>{formatCurrency(r.total_employee_nasscorp)}</TableCell>
                  <TableCell>{formatCurrency(r.total_employer_nasscorp)}</TableCell>
                  <TableCell>{formatCurrency(r.total_income_tax)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
