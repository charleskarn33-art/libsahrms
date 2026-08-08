import Link from "next/link";
import { ChevronRight, ReceiptText, ShieldCheck, Landmark, Users2, FileText, Download, Eye, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { ReportPeriodSelector } from "@/components/reports/period-selector";
import { RecordRemittanceDialog } from "@/components/nasscorp/record-remittance-dialog";
import { WhtTrendChart } from "@/components/nasscorp/wht-trend-chart";
import { NasscorpTrendChart } from "@/components/nasscorp/nasscorp-trend-chart";
import { bandLabel, bucketByTaxBand, type TaxBand } from "@/lib/tax-bands";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { TaxRemittance } from "@/types/database";

interface RemittanceRow {
  employee_number: string;
  employee_name: string;
  nasscorp_number: string;
  taxable_salary: number;
  employee_nasscorp: number;
  employer_nasscorp: number;
  income_tax: number;
}

const EXPORT_COLUMNS: { key: keyof RemittanceRow; label: string }[] = [
  { key: "employee_number", label: "Employee #" },
  { key: "employee_name", label: "Employee" },
  { key: "nasscorp_number", label: "NASSCORP #" },
  { key: "taxable_salary", label: "Taxable Salary" },
  { key: "employee_nasscorp", label: "Employee NASSCORP (4%)" },
  { key: "employer_nasscorp", label: "Employer NASSCORP (6%)" },
  { key: "income_tax", label: "Income Tax (WHT)" },
];

export default async function NasscorpPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodParam } = await searchParams;
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const { data: company } = await supabase.from("companies").select("*").eq("id", companyId ?? "").maybeSingle();

  const { data: periodRows } = await supabase
    .from("payroll_periods")
    .select("id, period_label, period_start, status")
    .eq("company_id", companyId ?? "")
    .in("status", ["locked", "paid"])
    .order("period_start");

  const { data: summaries } = await supabase.from("v_payroll_period_summary").select("*").eq("company_id", companyId ?? "");
  const summaryMap = new Map((summaries ?? []).map((s) => [s.payroll_period_id, s]));

  const { data: remittances } = await supabase.from("tax_remittances").select("*").eq("company_id", companyId ?? "");
  const remittanceMap = new Map((remittances ?? []).map((r) => [r.payroll_period_id, r as TaxRemittance]));

  const periods = (periodRows ?? []).map((p) => {
    const s = summaryMap.get(p.id);
    return {
      id: p.id,
      period_label: p.period_label,
      period_start: p.period_start,
      total_income_tax: Number(s?.total_income_tax ?? 0),
      total_employee_nasscorp: Number(s?.total_employee_nasscorp ?? 0),
      total_employer_nasscorp: Number(s?.total_employer_nasscorp ?? 0),
    };
  });

  const selectedIndex = periodParam ? periods.findIndex((p) => p.id === periodParam) : periods.length - 1;
  const selected = selectedIndex >= 0 ? periods[selectedIndex] : periods[periods.length - 1];
  const previous = selectedIndex > 0 ? periods[selectedIndex - 1] : undefined;

  const ytdYear = selected ? new Date(selected.period_start).getFullYear() : new Date().getFullYear();
  const ytdPeriods = selected ? periods.filter((p) => new Date(p.period_start).getFullYear() === ytdYear && p.period_start <= selected.period_start) : [];
  const ytd = {
    employee: ytdPeriods.reduce((sum, p) => sum + p.total_employee_nasscorp, 0),
    employer: ytdPeriods.reduce((sum, p) => sum + p.total_employer_nasscorp, 0),
    tax: ytdPeriods.reduce((sum, p) => sum + p.total_income_tax, 0),
  };

  function pctChange(current: number, prior: number | undefined) {
    if (!prior) return undefined;
    return ((current - prior) / prior) * 100;
  }

  const trendData = periods.slice(-6).map((p) => ({
    period: p.period_label,
    total: p.total_income_tax,
    employee: p.total_employee_nasscorp,
    employer: p.total_employer_nasscorp,
    nasscorpTotal: p.total_employee_nasscorp + p.total_employer_nasscorp,
  }));

  let bracketRows: RemittanceRow[] = [];
  if (selected) {
    const { data: items } = await supabase
      .from("payroll_items")
      .select("taxable_salary, income_tax, employee_nasscorp, employer_nasscorp, employees(first_name, last_name, employee_number, nasscorp_number)")
      .eq("payroll_period_id", selected.id);

    bracketRows = (items ?? []).map((item) => {
      const emp = item.employees as unknown as {
        first_name: string;
        last_name: string;
        employee_number: string;
        nasscorp_number: string | null;
      } | null;
      return {
        employee_number: emp?.employee_number ?? "—",
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "—",
        nasscorp_number: emp?.nasscorp_number ?? "—",
        taxable_salary: Number(item.taxable_salary),
        employee_nasscorp: Number(item.employee_nasscorp),
        employer_nasscorp: Number(item.employer_nasscorp),
        income_tax: Number(item.income_tax),
      };
    });
  }

  const bands: TaxBand[] = company?.income_tax_bands ?? [];
  const buckets = bucketByTaxBand(
    bands,
    bracketRows.map((r) => ({ taxableSalary: r.taxable_salary, incomeTax: r.income_tax }))
  );

  const exportRows = bracketRows.map((r) => ({
    ...r,
    taxable_salary: r.taxable_salary.toFixed(2),
    employee_nasscorp: r.employee_nasscorp.toFixed(2),
    employer_nasscorp: r.employer_nasscorp.toFixed(2),
    income_tax: r.income_tax.toFixed(2),
  }));

  // Compliance: earliest locked/paid period without a paid remittance record.
  const unpaid = periods.filter((p) => remittanceMap.get(p.id)?.status !== "paid");
  const isCompliant = unpaid.length === 0 || (unpaid.length === 1 && unpaid[0].id === periods[periods.length - 1]?.id);
  const nextDue = unpaid[0];
  const paidRemittances = Array.from(remittanceMap.values()).filter((r) => r.status === "paid");
  const lastRemittanceDate = paidRemittances.length
    ? paidRemittances.reduce((latest, r) => (r.payment_date > latest ? r.payment_date : latest), paidRemittances[0].payment_date)
    : null;

  const recentPeriods = [...periods].reverse().slice(0, 12);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>Tax &amp; NASSCORP</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Overview</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tax &amp; NASSCORP Overview</h1>
          <p className="text-sm text-muted-foreground">Manage tax deductions, WHT and NASSCORP contributions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {periods.length > 0 && selected && <ReportPeriodSelector basePath="/nasscorp" periods={periods} currentId={selected.id} />}
          <ReportExportButtons filename="nasscorp-remittance" rows={exportRows} columns={EXPORT_COLUMNS} />
          <Button variant="gradient" asChild disabled={!selected}>
            <Link href={selected ? `/api/reports/nasscorp/${selected.id}` : "#"} target="_blank">
              <FileText className="h-4 w-4" /> Tax &amp; NASSCORP Report
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={ReceiptText}
              label="Total Tax (WHT)"
              value={formatCurrency(selected?.total_income_tax ?? 0, company?.currency)}
              sublabel={selected?.period_label}
              trend={
                previous && pctChange(selected?.total_income_tax ?? 0, previous.total_income_tax) !== undefined
                  ? {
                      direction: (pctChange(selected!.total_income_tax, previous.total_income_tax) ?? 0) >= 0 ? "up" : "down",
                      label: `${Math.abs(pctChange(selected!.total_income_tax, previous.total_income_tax) ?? 0).toFixed(1)}% from ${previous.period_label}`,
                    }
                  : undefined
              }
              tone="primary"
            />
            <StatCard
              icon={ShieldCheck}
              label="Employee NASSCORP (4%)"
              value={formatCurrency(selected?.total_employee_nasscorp ?? 0, company?.currency)}
              sublabel={selected?.period_label}
              trend={
                previous
                  ? {
                      direction: (pctChange(selected!.total_employee_nasscorp, previous.total_employee_nasscorp) ?? 0) >= 0 ? "up" : "down",
                      label: `${Math.abs(pctChange(selected!.total_employee_nasscorp, previous.total_employee_nasscorp) ?? 0).toFixed(1)}% from ${previous.period_label}`,
                    }
                  : undefined
              }
              tone="secondary"
            />
            <StatCard
              icon={Landmark}
              label="Employer NASSCORP (6%)"
              value={formatCurrency(selected?.total_employer_nasscorp ?? 0, company?.currency)}
              sublabel={selected?.period_label}
              trend={
                previous
                  ? {
                      direction: (pctChange(selected!.total_employer_nasscorp, previous.total_employer_nasscorp) ?? 0) >= 0 ? "up" : "down",
                      label: `${Math.abs(pctChange(selected!.total_employer_nasscorp, previous.total_employer_nasscorp) ?? 0).toFixed(1)}% from ${previous.period_label}`,
                    }
                  : undefined
              }
              tone="accent"
            />
            <StatCard
              icon={Users2}
              label="Total NASSCORP"
              value={formatCurrency((selected?.total_employee_nasscorp ?? 0) + (selected?.total_employer_nasscorp ?? 0), company?.currency)}
              sublabel={selected?.period_label}
              tone="warning"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tax (WHT) Summary</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Income Bracket</TableHead>
                      <TableHead>Taxable Amount</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead className="text-right">Tax Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buckets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                          No data for this period.
                        </TableCell>
                      </TableRow>
                    )}
                    {buckets.map((b) => (
                      <TableRow key={b.label}>
                        <TableCell className="text-sm">
                          {b.label}
                          <span className="ml-1.5 text-xs text-muted-foreground">({b.rate}%)</span>
                        </TableCell>
                        <TableCell className="text-sm">{formatCurrency(b.taxableAmount, company?.currency)}</TableCell>
                        <TableCell className="text-sm">{b.employeeCount}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(b.taxAmount, company?.currency)}</TableCell>
                      </TableRow>
                    ))}
                    {buckets.length > 0 && (
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell>{formatCurrency(buckets.reduce((s, b) => s + b.taxableAmount, 0), company?.currency)}</TableCell>
                        <TableCell>{buckets.reduce((s, b) => s + b.employeeCount, 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(buckets.reduce((s, b) => s + b.taxAmount, 0), company?.currency)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>NASSCORP Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <SummaryRow label="Description" employee="Employee (4%)" employer="Employer (6%)" total="Total" header />
                <SummaryRow
                  label={selected ? `This Period (${selected.period_label})` : "This Period"}
                  employee={formatCurrency(selected?.total_employee_nasscorp ?? 0, company?.currency)}
                  employer={formatCurrency(selected?.total_employer_nasscorp ?? 0, company?.currency)}
                  total={formatCurrency((selected?.total_employee_nasscorp ?? 0) + (selected?.total_employer_nasscorp ?? 0), company?.currency)}
                />
                <SummaryRow
                  label={previous ? `Previous Period (${previous.period_label})` : "Previous Period"}
                  employee={formatCurrency(previous?.total_employee_nasscorp ?? 0, company?.currency)}
                  employer={formatCurrency(previous?.total_employer_nasscorp ?? 0, company?.currency)}
                  total={formatCurrency((previous?.total_employee_nasscorp ?? 0) + (previous?.total_employer_nasscorp ?? 0), company?.currency)}
                />
                <SummaryRow
                  label={`Year to Date (${ytdYear})`}
                  employee={formatCurrency(ytd.employee, company?.currency)}
                  employer={formatCurrency(ytd.employer, company?.currency)}
                  total={formatCurrency(ytd.employee + ytd.employer, company?.currency)}
                  emphasize
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <WhtTrendChart data={trendData.map((d) => ({ period: d.period, total: d.total }))} />
            <NasscorpTrendChart data={trendData.map((d) => ({ period: d.period, employee: d.employee, employer: d.employer, total: d.nasscorpTotal }))} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Tax &amp; NASSCORP Payments</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Tax (WHT)</TableHead>
                    <TableHead>Employee NASSCORP</TableHead>
                    <TableHead>Employer NASSCORP</TableHead>
                    <TableHead>Total NASSCORP</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt / Reference</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPeriods.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                        No locked payroll periods yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {recentPeriods.map((p) => {
                    const remittance = remittanceMap.get(p.id);
                    const totalNasscorp = p.total_employee_nasscorp + p.total_employer_nasscorp;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.period_label}</TableCell>
                        <TableCell>{formatCurrency(p.total_income_tax, company?.currency)}</TableCell>
                        <TableCell>{formatCurrency(p.total_employee_nasscorp, company?.currency)}</TableCell>
                        <TableCell>{formatCurrency(p.total_employer_nasscorp, company?.currency)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(totalNasscorp, company?.currency)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {remittance ? formatDate(remittance.payment_date) : "—"}
                        </TableCell>
                        <TableCell>
                          {remittance?.status === "paid" ? (
                            <Badge variant="success">Paid</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{remittance?.receipt_reference ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild title="View report">
                              <Link href={`/api/reports/nasscorp/${p.id}`} target="_blank">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild title="Download report">
                              <Link href={`/api/reports/nasscorp/${p.id}?download=1`}>
                                <Download className="h-4 w-4" />
                              </Link>
                            </Button>
                            {remittance?.status !== "paid" && <RecordRemittanceDialog periodId={p.id} periodLabel={p.period_label} />}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">WHT (Withholding Tax) Rates</p>
                <div className="space-y-1.5">
                  {bands.map((band, i) => {
                    const lower = i === 0 ? 0 : bands[i - 1].upTo ?? 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{bandLabel(band, lower)}</span>
                        <span className="font-medium">{band.rate}%</span>
                      </div>
                    );
                  })}
                  {bands.length === 0 && <p className="text-sm text-muted-foreground">No tax bands configured.</p>}
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">NASSCORP Rates</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Employee Contribution</span>
                    <span className="font-medium">{company?.employee_nasscorp_rate ?? 4}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Employer Contribution</span>
                    <span className="font-medium">{company?.employer_nasscorp_rate ?? 6}%</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary-700">
                  <span>Total Contribution</span>
                  <span>{(Number(company?.employee_nasscorp_rate ?? 4) + Number(company?.employer_nasscorp_rate ?? 6)).toFixed(0)}%</span>
                </div>
              </div>
              <Link href="/settings" className="inline-block text-sm font-medium text-primary hover:underline">
                Edit Rates →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  {isCompliant ? <CheckCircle2 className="h-4 w-4 text-secondary" /> : <AlertTriangle className="h-4 w-4 text-danger" />}
                  <div>
                    <p className="font-medium">WHT Compliance</p>
                    <p className="text-xs text-muted-foreground">{isCompliant ? "All tax obligations up to date" : "A prior period's remittance is unrecorded"}</p>
                  </div>
                </div>
                <Badge variant={isCompliant ? "success" : "danger"}>{isCompliant ? "Compliant" : "Overdue"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  {isCompliant ? <CheckCircle2 className="h-4 w-4 text-secondary" /> : <AlertTriangle className="h-4 w-4 text-danger" />}
                  <div>
                    <p className="font-medium">NASSCORP Compliance</p>
                    <p className="text-xs text-muted-foreground">{isCompliant ? "All contributions up to date" : "A prior period's remittance is unrecorded"}</p>
                  </div>
                </div>
                <Badge variant={isCompliant ? "success" : "danger"}>{isCompliant ? "Compliant" : "Overdue"}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Remittance Date</span>
                <span className="font-medium">{lastRemittanceDate ? formatDate(lastRemittanceDate) : "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Next Remittance Due</span>
                <span className="font-medium">{nextDue ? nextDue.period_label : "None outstanding"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Need Help?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rates are configured per company in Settings and drive the payroll engine automatically — the summaries above
                  always match what was actually paid out.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  employee,
  employer,
  total,
  header,
  emphasize,
}: {
  label: string;
  employee: string;
  employer: string;
  total: string;
  header?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div
      className={
        header
          ? "grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2 border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          : emphasize
            ? "grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2 rounded-lg bg-primary/5 px-1.5 py-2 text-sm font-semibold text-primary-700"
            : "grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2 py-1.5 text-sm"
      }
    >
      <span className={header ? "" : "text-muted-foreground"}>{label}</span>
      <span className="text-right">{employee}</span>
      <span className="text-right">{employer}</span>
      <span className="text-right">{total}</span>
    </div>
  );
}

export const dynamic = "force-dynamic";
