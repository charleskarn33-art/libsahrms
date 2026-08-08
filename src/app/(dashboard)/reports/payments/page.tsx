import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { ReportPeriodSelector } from "@/components/reports/period-selector";
import { formatCurrency } from "@/lib/utils";

interface PaymentRow {
  employee_number: string;
  employee_name: string;
  payment_method: string;
  bank_name: string;
  account_number: string;
  net_salary: number;
}

const COLUMNS: { key: keyof PaymentRow; label: string }[] = [
  { key: "employee_number", label: "Employee #" },
  { key: "employee_name", label: "Employee" },
  { key: "payment_method", label: "Method" },
  { key: "bank_name", label: "Bank" },
  { key: "account_number", label: "Account / Orange Money #" },
  { key: "net_salary", label: "Net Pay" },
];

export default async function PaymentsReportPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodParam } = await searchParams;
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const { data: eligiblePeriods } = await supabase
    .from("payroll_periods")
    .select("id, period_label")
    .eq("company_id", companyId ?? "")
    .in("status", ["locked", "paid"])
    .order("period_start", { ascending: false });

  const periodId = eligiblePeriods?.find((p) => p.id === periodParam)?.id ?? eligiblePeriods?.[0]?.id;

  let rows: PaymentRow[] = [];
  if (periodId) {
    const { data: items } = await supabase
      .from("payroll_items")
      .select(
        "net_salary, employees(first_name, last_name, employee_number, payment_method, bank_name, bank_account_number, orange_money_number)"
      )
      .eq("payroll_period_id", periodId)
      .order("created_at");

    rows = (items ?? []).map((item) => {
      const emp = item.employees as unknown as {
        first_name: string;
        last_name: string;
        employee_number: string;
        payment_method: string;
        bank_name: string | null;
        bank_account_number: string | null;
        orange_money_number: string | null;
      } | null;
      const isOrangeMoney = emp?.payment_method === "orange_money";
      return {
        employee_number: emp?.employee_number ?? "—",
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "—",
        payment_method: emp?.payment_method ?? "—",
        bank_name: isOrangeMoney ? "—" : emp?.bank_name ?? "—",
        account_number: isOrangeMoney ? emp?.orange_money_number ?? "—" : emp?.bank_account_number ?? "—",
        net_salary: Number(item.net_salary),
      };
    });
  }

  const totalNet = rows.reduce((sum, r) => sum + r.net_salary, 0);
  const exportRows = rows.map((r) => ({ ...r, net_salary: r.net_salary.toFixed(2) }));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/reports">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bank &amp; Orange Money Transfer Report</h1>
        <p className="text-sm text-muted-foreground">Net pay by employee, ready to hand to the bank or mobile money provider.</p>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>{rows.length} employee(s) — Total {formatCurrency(totalNet)}</CardTitle>
          <div className="flex items-center gap-2">
            {eligiblePeriods && eligiblePeriods.length > 0 && periodId && (
              <ReportPeriodSelector basePath="/reports/payments" periods={eligiblePeriods} currentId={periodId} />
            )}
            <ReportExportButtons
              filename="bank-orange-money-transfers"
              rows={exportRows}
              columns={COLUMNS}
              pdfHref={periodId ? `/api/reports/payments/${periodId}` : undefined}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Account / Orange Money #</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!periodId ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No locked payroll periods yet.
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No payroll items for this period.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.employee_number}>
                    <TableCell>
                      <p className="font-medium leading-tight">{r.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{r.employee_number}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.payment_method.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.bank_name}</TableCell>
                    <TableCell>{r.account_number}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.net_salary)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
