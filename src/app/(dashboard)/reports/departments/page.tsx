import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { ReportPeriodSelector } from "@/components/reports/period-selector";
import { formatCurrency } from "@/lib/utils";

interface HeadcountRow {
  department_name: string;
  active_headcount: number;
  total_basic_salary: number;
}

const HEADCOUNT_COLUMNS: { key: keyof HeadcountRow; label: string }[] = [
  { key: "department_name", label: "Department" },
  { key: "active_headcount", label: "Active Headcount" },
  { key: "total_basic_salary", label: "Total Basic Salary" },
];

interface DeptCostRow {
  department_name: string;
  employee_count: number;
  gross_salary: number;
  deductions: number;
  net_salary: number;
}

const COST_COLUMNS: { key: keyof DeptCostRow; label: string }[] = [
  { key: "department_name", label: "Department" },
  { key: "employee_count", label: "Employees" },
  { key: "gross_salary", label: "Gross Pay" },
  { key: "deductions", label: "Deductions" },
  { key: "net_salary", label: "Net Pay" },
];

export default async function DepartmentCostReportPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodParam } = await searchParams;
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const { data: headcount } = await supabase
    .from("v_department_headcount")
    .select("*")
    .eq("company_id", companyId ?? "")
    .order("department_name");

  const headcountRows: HeadcountRow[] = (headcount ?? []).map((h) => ({
    department_name: h.department_name,
    active_headcount: Number(h.active_headcount),
    total_basic_salary: Number(h.total_basic_salary),
  }));

  const { data: eligiblePeriods } = await supabase
    .from("payroll_periods")
    .select("id, period_label")
    .eq("company_id", companyId ?? "")
    .in("status", ["locked", "paid"])
    .order("period_start", { ascending: false });

  const periodId = eligiblePeriods?.find((p) => p.id === periodParam)?.id ?? eligiblePeriods?.[0]?.id;

  let deptCostRows: DeptCostRow[] = [];
  if (periodId) {
    const { data: items } = await supabase
      .from("payroll_items")
      .select("gross_salary, total_deductions, net_salary, employees(departments(name))")
      .eq("payroll_period_id", periodId);

    const byDept = new Map<string, DeptCostRow>();
    for (const item of items ?? []) {
      const emp = item.employees as unknown as { departments: { name: string } | null } | null;
      const deptName = emp?.departments?.name ?? "Unassigned";
      const existing = byDept.get(deptName) ?? {
        department_name: deptName,
        employee_count: 0,
        gross_salary: 0,
        deductions: 0,
        net_salary: 0,
      };
      existing.employee_count += 1;
      existing.gross_salary += Number(item.gross_salary);
      existing.deductions += Number(item.total_deductions);
      existing.net_salary += Number(item.net_salary);
      byDept.set(deptName, existing);
    }
    deptCostRows = Array.from(byDept.values()).sort((a, b) => a.department_name.localeCompare(b.department_name));
  }

  const headcountExportRows = headcountRows.map((r) => ({ ...r, total_basic_salary: r.total_basic_salary.toFixed(2) }));
  const costExportRows = deptCostRows.map((r) => ({
    ...r,
    gross_salary: r.gross_salary.toFixed(2),
    deductions: r.deductions.toFixed(2),
    net_salary: r.net_salary.toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/reports">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Department Cost Report</h1>
        <p className="text-sm text-muted-foreground">Headcount and salary cost by department.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Current Establishment</CardTitle>
          <ReportExportButtons filename="department-headcount" rows={headcountExportRows} columns={HEADCOUNT_COLUMNS} />
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Active Headcount</TableHead>
                <TableHead>Total Basic Salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headcountRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    No departments yet.
                  </TableCell>
                </TableRow>
              )}
              {headcountRows.map((r) => (
                <TableRow key={r.department_name}>
                  <TableCell className="font-medium">{r.department_name}</TableCell>
                  <TableCell>{r.active_headcount}</TableCell>
                  <TableCell>{formatCurrency(r.total_basic_salary)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Actual Payroll Cost by Department</CardTitle>
          <div className="flex items-center gap-2">
            {eligiblePeriods && eligiblePeriods.length > 0 && periodId && (
              <ReportPeriodSelector basePath="/reports/departments" periods={eligiblePeriods} currentId={periodId} />
            )}
            <ReportExportButtons filename="department-payroll-cost" rows={costExportRows} columns={COST_COLUMNS} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!periodId ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No locked payroll periods yet.
                  </TableCell>
                </TableRow>
              ) : deptCostRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No payroll items for this period.
                  </TableCell>
                </TableRow>
              ) : (
                deptCostRows.map((r) => (
                  <TableRow key={r.department_name}>
                    <TableCell className="font-medium">{r.department_name}</TableCell>
                    <TableCell>{r.employee_count}</TableCell>
                    <TableCell>{formatCurrency(r.gross_salary)}</TableCell>
                    <TableCell>{formatCurrency(r.deductions)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(r.net_salary)}</TableCell>
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
