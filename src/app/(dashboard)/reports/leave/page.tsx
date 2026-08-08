import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { formatDate } from "@/lib/utils";
import type { LeaveType } from "@/types/database";

interface LeaveDetailRow {
  employee_number: string;
  employee_name: string;
  department_name: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_requested: number;
}

const COLUMNS: { key: keyof LeaveDetailRow; label: string }[] = [
  { key: "employee_number", label: "Employee #" },
  { key: "employee_name", label: "Employee" },
  { key: "department_name", label: "Department" },
  { key: "leave_type", label: "Leave Type" },
  { key: "start_date", label: "Start" },
  { key: "end_date", label: "End" },
  { key: "days_requested", label: "Days" },
];

function firstOfYear() {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function LeaveReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from: fromParam, to: toParam } = await searchParams;
  const from = fromParam || firstOfYear();
  const to = toParam || today();

  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const { data: requests } = await supabase
    .from("leave_requests")
    .select(
      "leave_type, start_date, end_date, days_requested, status, employees(employee_number, first_name, last_name, departments!department_id(name))"
    )
    .eq("company_id", companyId ?? "")
    .eq("status", "approved")
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date");

  const rows: LeaveDetailRow[] = (requests ?? []).map((r) => {
    const emp = r.employees as unknown as {
      employee_number: string;
      first_name: string;
      last_name: string;
      departments: { name: string } | null;
    } | null;
    return {
      employee_number: emp?.employee_number ?? "—",
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "—",
      department_name: emp?.departments?.name ?? "—",
      leave_type: r.leave_type as LeaveType,
      start_date: formatDate(r.start_date),
      end_date: formatDate(r.end_date),
      days_requested: Number(r.days_requested),
    };
  });

  const byType = new Map<string, number>();
  const byDept = new Map<string, number>();
  for (const r of rows) {
    byType.set(r.leave_type, (byType.get(r.leave_type) ?? 0) + r.days_requested);
    byDept.set(r.department_name, (byDept.get(r.department_name) ?? 0) + r.days_requested);
  }

  const totalDays = rows.reduce((sum, r) => sum + r.days_requested, 0);
  const exportRows = rows.map((r) => ({ ...r, days_requested: r.days_requested.toFixed(2) }));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/reports">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Report</h1>
          <p className="text-sm text-muted-foreground">Approved leave taken by type and department for a date range.</p>
        </div>
        <form className="flex items-center gap-2" method="get">
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input type="date" name="to" defaultValue={to} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By Leave Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byType.size === 0 && <p className="text-sm text-muted-foreground">No approved leave in this range.</p>}
            {Array.from(byType.entries()).map(([type, days]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <Badge variant="outline" className="capitalize">
                  {type}
                </Badge>
                <span className="font-medium">{days.toFixed(1)} days</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By Department</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byDept.size === 0 && <p className="text-sm text-muted-foreground">No approved leave in this range.</p>}
            {Array.from(byDept.entries()).map(([dept, days]) => (
              <div key={dept} className="flex items-center justify-between text-sm">
                <span>{dept}</span>
                <span className="font-medium">{days.toFixed(1)} days</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>
            {rows.length} request(s) — {totalDays.toFixed(1)} days total
          </CardTitle>
          <ReportExportButtons filename="leave-report" rows={exportRows} columns={COLUMNS} />
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No approved leave in this range.
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
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {r.leave_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.start_date}</TableCell>
                  <TableCell>{r.end_date}</TableCell>
                  <TableCell>{r.days_requested.toFixed(1)}</TableCell>
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
