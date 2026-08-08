import Link from "next/link";
import { ArrowLeft, HandCoins, PiggyBank, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { LoanStatus } from "@/types/database";

interface LoanRow {
  employee_number: string;
  employee_name: string;
  department_name: string;
  loan_type: string;
  principal_amount: number;
  monthly_deduction: number;
  balance_remaining: number;
  status: LoanStatus;
  requested_at: string;
}

const COLUMNS: { key: keyof LoanRow; label: string }[] = [
  { key: "employee_number", label: "Employee #" },
  { key: "employee_name", label: "Employee" },
  { key: "department_name", label: "Department" },
  { key: "loan_type", label: "Type" },
  { key: "principal_amount", label: "Principal" },
  { key: "monthly_deduction", label: "Monthly Deduction" },
  { key: "balance_remaining", label: "Balance Remaining" },
  { key: "status", label: "Status" },
  { key: "requested_at", label: "Requested" },
];

const STATUS_VARIANT: Record<LoanStatus, "success" | "warning" | "default" | "danger" | "outline"> = {
  active: "default",
  completed: "success",
  approved: "success",
  pending: "warning",
  rejected: "danger",
  cancelled: "outline",
};

export default async function LoansReportPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const { data: loans } = await supabase
    .from("loans")
    .select(
      "loan_type, principal_amount, monthly_deduction, balance_remaining, status, requested_at, employees(employee_number, first_name, last_name, departments!department_id(name))"
    )
    .eq("company_id", companyId ?? "")
    .order("requested_at", { ascending: false });

  const rows: LoanRow[] = (loans ?? []).map((l) => {
    const emp = l.employees as unknown as {
      employee_number: string;
      first_name: string;
      last_name: string;
      departments: { name: string } | null;
    } | null;
    return {
      employee_number: emp?.employee_number ?? "—",
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "—",
      department_name: emp?.departments?.name ?? "—",
      loan_type: l.loan_type.replace("_", " "),
      principal_amount: Number(l.principal_amount),
      monthly_deduction: Number(l.monthly_deduction),
      balance_remaining: Number(l.balance_remaining),
      status: l.status as LoanStatus,
      requested_at: formatDate(l.requested_at),
    };
  });

  const activeLoans = rows.filter((r) => r.status === "active");
  const pendingLoans = rows.filter((r) => r.status === "pending");
  const totalOutstanding = activeLoans.reduce((sum, r) => sum + r.balance_remaining, 0);
  const totalMonthlyDeductions = activeLoans.reduce((sum, r) => sum + r.monthly_deduction, 0);

  const exportRows = rows.map((r) => ({
    ...r,
    principal_amount: r.principal_amount.toFixed(2),
    monthly_deduction: r.monthly_deduction.toFixed(2),
    balance_remaining: r.balance_remaining.toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/reports">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Loans &amp; Advances Report</h1>
        <p className="text-sm text-muted-foreground">Outstanding balances, monthly deductions, and repayment status.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={HandCoins} label="Active Loans" value={String(activeLoans.length)} tone="primary" />
        <StatCard icon={PiggyBank} label="Total Outstanding" value={formatCurrency(totalOutstanding)} tone="danger" />
        <StatCard icon={HandCoins} label="Monthly Deductions" value={formatCurrency(totalMonthlyDeductions)} tone="secondary" />
        <StatCard icon={Clock3} label="Pending Requests" value={String(pendingLoans.length)} tone="warning" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>All Loans &amp; Advances</CardTitle>
          <ReportExportButtons filename="loans-report" rows={exportRows} columns={COLUMNS} />
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Monthly Deduction</TableHead>
                <TableHead>Balance Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No loans or advances yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <p className="font-medium leading-tight">{r.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{r.employee_number}</p>
                  </TableCell>
                  <TableCell>{r.department_name}</TableCell>
                  <TableCell className="capitalize">{r.loan_type}</TableCell>
                  <TableCell>{formatCurrency(r.principal_amount)}</TableCell>
                  <TableCell>{formatCurrency(r.monthly_deduction)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(r.balance_remaining)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.requested_at}</TableCell>
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
