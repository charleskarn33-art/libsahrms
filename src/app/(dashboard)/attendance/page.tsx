import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClockWidget } from "@/components/attendance/clock-widget";
import type { AttendanceStatus, UserRole } from "@/types/database";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "outline"> = {
  present: "success",
  late: "warning",
  early_leave: "warning",
  absent: "danger",
  holiday: "outline",
  weekend: "outline",
  on_leave: "outline",
};

const HR_ROLES: UserRole[] = ["super_admin", "hr_manager"];

export default async function AttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const isHr = profile ? HR_ROLES.includes(profile.role as UserRole) : false;

  const { data: employee } = await supabase.from("employees").select("id").eq("profile_id", user?.id ?? "").maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayRecord } = employee
    ? await supabase
        .from("attendance_records")
        .select("clock_in, clock_out")
        .eq("employee_id", employee.id)
        .eq("work_date", today)
        .maybeSingle()
    : { data: null };

  const recordsQuery = supabase
    .from("attendance_records")
    .select("id, work_date, clock_in, clock_out, status, overtime_hours, employees(first_name, last_name)")
    .order("work_date", { ascending: false })
    .limit(30);

  const { data: records } = isHr ? await recordsQuery : await recordsQuery.eq("employee_id", employee?.id ?? "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          {isHr ? "Track team attendance, lateness, and overtime." : "Clock in and view your attendance history."}
        </p>
      </div>

      {employee && <ClockWidget clockedInAt={todayRecord?.clock_in ?? null} clockedOutAt={todayRecord?.clock_out ?? null} />}

      <Card>
        <CardHeader>
          <CardTitle>{isHr ? "Recent Attendance" : "My Attendance History"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                {isHr && <TableHead>Employee</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(records ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={isHr ? 6 : 5} className="py-10 text-center text-sm text-muted-foreground">
                    No attendance records yet.
                  </TableCell>
                </TableRow>
              )}
              {(records ?? []).map((r) => {
                const emp = r.employees as unknown as { first_name: string; last_name: string } | null;
                return (
                  <TableRow key={r.id}>
                    {isHr && <TableCell className="font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</TableCell>}
                    <TableCell>{r.work_date}</TableCell>
                    <TableCell>{r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell>{r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell>{r.overtime_hours || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status as AttendanceStatus]} className="capitalize">
                        {(r.status as string).replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
