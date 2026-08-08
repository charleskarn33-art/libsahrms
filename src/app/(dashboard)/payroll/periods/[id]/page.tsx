import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { WorkflowActions } from "@/components/payroll/workflow-actions";
import { ExportPayrollItemsButton } from "@/components/payroll/export-payroll-items-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Users, Wallet, ReceiptText, PiggyBank } from "lucide-react";
import type { PayrollStatus, UserRole } from "@/types/database";

const STATUS_VARIANT: Record<PayrollStatus, "success" | "warning" | "default" | "danger" | "outline"> = {
  paid: "success",
  approved: "success",
  locked: "default",
  pending: "warning",
  draft: "outline",
  cancelled: "danger",
};

export default async function PayrollPeriodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: period } = await supabase.from("payroll_periods").select("*").eq("id", id).maybeSingle();
  if (!period) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const role = (profile?.role ?? "employee") as UserRole;

  const { data: items } = await supabase
    .from("payroll_items")
    .select(
      "basic_salary, gross_salary, employee_nasscorp, income_tax, loan_deductions, total_deductions, net_salary, employees(employee_number, first_name, last_name, departments(name))"
    )
    .eq("payroll_period_id", id)
    .order("created_at");

  const rows = (items ?? []).map((item) => {
    const emp = item.employees as unknown as {
      employee_number: string;
      first_name: string;
      last_name: string;
      departments: { name: string } | null;
    } | null;
    return {
      employee_number: emp?.employee_number ?? "—",
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "—",
      department_name: emp?.departments?.name ?? "—",
      basic_salary: Number(item.basic_salary),
      gross_salary: Number(item.gross_salary),
      employee_nasscorp: Number(item.employee_nasscorp),
      income_tax: Number(item.income_tax),
      loan_deductions: Number(item.loan_deductions),
      total_deductions: Number(item.total_deductions),
      net_salary: Number(item.net_salary),
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.gross_salary,
      deductions: acc.deductions + r.total_deductions,
      net: acc.net + r.net_salary,
    }),
    { gross: 0, deductions: 0, net: 0 }
  );

  const isActive = !["locked", "paid", "cancelled"].includes(period.status);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/payroll/periods">
          <ArrowLeft className="h-4 w-4" /> Back to Payroll Periods
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{period.period_label}</h1>
            <Badge variant={STATUS_VARIANT[period.status as PayrollStatus]} className="capitalize">
              {period.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(period.period_start)} – {formatDate(period.period_end)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportPayrollItemsButton periodLabel={period.period_label} rows={rows} />
          {isActive && <WorkflowActions periodId={period.id} stage={period.approval_stage} role={role} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Employees" value={String(rows.length)} tone="primary" />
        <StatCard icon={Wallet} label="Gross Pay" value={formatCurrency(totals.gross)} tone="secondary" />
        <StatCard icon={ReceiptText} label="Deductions" value={formatCurrency(totals.deductions)} tone="danger" />
        <StatCard icon={PiggyBank} label="Net Pay" value={formatCurrency(totals.net)} tone="accent" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Payroll Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Basic Salary</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Payroll hasn&apos;t been generated for this period yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.employee_number}>
                  <TableCell>
                    <p className="font-medium leading-tight">{r.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{r.employee_number}</p>
                  </TableCell>
                  <TableCell>{r.department_name}</TableCell>
                  <TableCell>{formatCurrency(r.basic_salary)}</TableCell>
                  <TableCell>{formatCurrency(r.gross_salary)}</TableCell>
                  <TableCell>{formatCurrency(r.total_deductions)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(r.net_salary)}</TableCell>
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
