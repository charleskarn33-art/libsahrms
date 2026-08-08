import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { ReportPeriodSelector } from "@/components/reports/period-selector";
import { formatCurrency } from "@/lib/utils";

interface RemittanceRow {
  employee_number: string;
  employee_name: string;
  nasscorp_number: string;
  employee_nasscorp: number;
  employer_nasscorp: number;
  income_tax: number;
}

const COLUMNS: { key: keyof RemittanceRow; label: string }[] = [
  { key: "employee_number", label: "Employee #" },
  { key: "employee_name", label: "Employee" },
  { key: "nasscorp_number", label: "NASSCORP #" },
  { key: "employee_nasscorp", label: "Employee NASSCORP (4%)" },
  { key: "employer_nasscorp", label: "Employer NASSCORP (6%)" },
  { key: "income_tax", label: "Income Tax (WHT)" },
];

export default async function NasscorpPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodParam } = await searchParams;
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const { data: company } = await supabase.from("companies").select("*").eq("id", companyId ?? "").maybeSingle();

  const { data: eligiblePeriods } = await supabase
    .from("payroll_periods")
    .select("id, period_label")
    .eq("company_id", companyId ?? "")
    .in("status", ["locked", "paid"])
    .order("period_start", { ascending: false });

  const periodId = eligiblePeriods?.find((p) => p.id === periodParam)?.id ?? eligiblePeriods?.[0]?.id;

  let rows: RemittanceRow[] = [];
  if (periodId) {
    const { data: items } = await supabase
      .from("payroll_items")
      .select("employee_nasscorp, employer_nasscorp, income_tax, employees(first_name, last_name, employee_number, nasscorp_number)")
      .eq("payroll_period_id", periodId)
      .order("created_at");

    rows = (items ?? []).map((item) => {
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
        employee_nasscorp: Number(item.employee_nasscorp),
        employer_nasscorp: Number(item.employer_nasscorp),
        income_tax: Number(item.income_tax),
      };
    });
  }

  const totals = rows.reduce(
    (acc, r) => ({
      employee_nasscorp: acc.employee_nasscorp + r.employee_nasscorp,
      employer_nasscorp: acc.employer_nasscorp + r.employer_nasscorp,
      income_tax: acc.income_tax + r.income_tax,
    }),
    { employee_nasscorp: 0, employer_nasscorp: 0, income_tax: 0 }
  );

  const exportRows = rows.map((r) => ({
    ...r,
    employee_nasscorp: r.employee_nasscorp.toFixed(2),
    employer_nasscorp: r.employer_nasscorp.toFixed(2),
    income_tax: r.income_tax.toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tax &amp; NASSCORP</h1>
        <p className="text-sm text-muted-foreground">Statutory contribution rates and the per-period remittance report.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Employee NASSCORP Rate</p>
            <p className="mt-1 text-2xl font-bold">{company?.employee_nasscorp_rate ?? 4}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Employer NASSCORP Rate</p>
            <p className="mt-1 text-2xl font-bold">{company?.employer_nasscorp_rate ?? 6}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Selected Period Income Tax</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totals.income_tax)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Remittance Report</CardTitle>
          <div className="flex items-center gap-2">
            {eligiblePeriods && eligiblePeriods.length > 0 && periodId && (
              <ReportPeriodSelector basePath="/nasscorp" periods={eligiblePeriods} currentId={periodId} />
            )}
            <ReportExportButtons
              filename="nasscorp-remittance"
              rows={exportRows}
              columns={COLUMNS}
              pdfHref={periodId ? `/api/reports/nasscorp/${periodId}` : undefined}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>NASSCORP #</TableHead>
                <TableHead>Employee (4%)</TableHead>
                <TableHead>Employer (6%)</TableHead>
                <TableHead>Total NASSCORP</TableHead>
                <TableHead>Income Tax (WHT)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!periodId ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No locked payroll periods yet.
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No payroll items for this period.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {rows.map((r) => (
                    <TableRow key={r.employee_number}>
                      <TableCell>
                        <p className="font-medium leading-tight">{r.employee_name}</p>
                        <p className="text-xs text-muted-foreground">{r.employee_number}</p>
                      </TableCell>
                      <TableCell>{r.nasscorp_number}</TableCell>
                      <TableCell>{formatCurrency(r.employee_nasscorp)}</TableCell>
                      <TableCell>{formatCurrency(r.employer_nasscorp)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(r.employee_nasscorp + r.employer_nasscorp)}</TableCell>
                      <TableCell>{formatCurrency(r.income_tax)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell colSpan={2}>Totals</TableCell>
                    <TableCell>{formatCurrency(totals.employee_nasscorp)}</TableCell>
                    <TableCell>{formatCurrency(totals.employer_nasscorp)}</TableCell>
                    <TableCell>{formatCurrency(totals.employee_nasscorp + totals.employer_nasscorp)}</TableCell>
                    <TableCell>{formatCurrency(totals.income_tax)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
