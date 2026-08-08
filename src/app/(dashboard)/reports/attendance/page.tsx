import Link from "next/link";
import { ArrowLeft, Users, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import type { AttendanceStatus } from "@/types/database";

interface AttendanceRow {
  employee_number: string;
  employee_name: string;
  department_name: string;
  present: number;
  late: number;
  absent: number;
  on_leave: number;
  overtime_hours: number;
}

const COLUMNS: { key: keyof AttendanceRow; label: string }[] = [
  { key: "employee_number", label: "Employee #" },
  { key: "employee_name", label: "Employee" },
  { key: "department_name", label: "Department" },
  { key: "present", label: "Present" },
  { key: "late", label: "Late" },
  { key: "absent", label: "Absent" },
  { key: "on_leave", label: "On Leave" },
  { key: "overtime_hours", label: "Overtime Hours" },
];

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AttendanceReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from: fromParam, to: toParam } = await searchParams;
  const from = fromParam || firstOfMonth();
  const to = toParam || today();

  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const { data: records } = await supabase
    .from("attendance_records")
    .select("work_date, status, overtime_hours, employees(employee_number, first_name, last_name, departments!department_id(name))")
    .eq("company_id", companyId ?? "")
    .gte("work_date", from)
    .lte("work_date", to);

  const byEmployee = new Map<string, AttendanceRow>();
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalOvertime = 0;

  for (const rec of records ?? []) {
    const emp = rec.employees as unknown as {
      employee_number: string;
      first_name: string;
      last_name: string;
      departments: { name: string } | null;
    } | null;
    if (!emp) continue;

    const key = emp.employee_number;
    const existing = byEmployee.get(key) ?? {
      employee_number: emp.employee_number,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      department_name: emp.departments?.name ?? "—",
      present: 0,
      late: 0,
      absent: 0,
      on_leave: 0,
      overtime_hours: 0,
    };

    const status = rec.status as AttendanceStatus;
    if (status === "present") existing.present += 1;
    else if (status === "late") existing.late += 1;
    else if (status === "absent") existing.absent += 1;
    else if (status === "on_leave") existing.on_leave += 1;
    existing.overtime_hours += Number(rec.overtime_hours ?? 0);

    byEmployee.set(key, existing);

    if (status === "present" || status === "late") totalPresent += 1;
    if (status === "absent") totalAbsent += 1;
    totalOvertime += Number(rec.overtime_hours ?? 0);
  }

  const rows = Array.from(byEmployee.values()).sort((a, b) => a.employee_name.localeCompare(b.employee_name));
  const exportRows = rows.map((r) => ({ ...r, overtime_hours: r.overtime_hours.toFixed(2) }));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/reports">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Report</h1>
          <p className="text-sm text-muted-foreground">Present, late, absent, and overtime by employee for a date range.</p>
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Employees with Records" value={String(rows.length)} tone="primary" />
        <StatCard icon={CheckCircle2} label="Present / Late Days" value={String(totalPresent)} tone="secondary" />
        <StatCard icon={XCircle} label="Absent Days" value={String(totalAbsent)} tone="danger" />
        <StatCard icon={Clock3} label="Overtime Hours" value={totalOvertime.toFixed(1)} tone="accent" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>
            {from} – {to}
          </CardTitle>
          <ReportExportButtons filename="attendance-report" rows={exportRows} columns={COLUMNS} />
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>On Leave</TableHead>
                <TableHead>Overtime Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No attendance records in this range.
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
                  <TableCell>{r.present}</TableCell>
                  <TableCell>{r.late}</TableCell>
                  <TableCell>{r.absent}</TableCell>
                  <TableCell>{r.on_leave}</TableCell>
                  <TableCell>{r.overtime_hours.toFixed(2)}</TableCell>
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
