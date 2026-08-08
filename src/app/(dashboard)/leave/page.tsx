import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { LeaveStatCards } from "@/components/leave/leave-stat-cards";
import { LeaveTable, type LeaveRequestRow } from "@/components/leave/leave-table";
import { LeaveBalanceSummary } from "@/components/leave/leave-balance-summary";
import { LeaveQuickActions } from "@/components/leave/leave-quick-actions";
import { LeaveRequestDialogProvider, NewLeaveRequestButton } from "@/components/leave/leave-request-context";
import { Card, CardContent } from "@/components/ui/card";
import type { LeaveRequestStatus, UserRole } from "@/types/database";

const HR_ROLES: UserRole[] = ["super_admin", "hr_manager"];

export default async function LeavePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const isHr = profile ? HR_ROLES.includes(profile.role as UserRole) : false;

  const { data: employee } = await supabase.from("employees").select("id").eq("profile_id", user?.id ?? "").maybeSingle();

  const companyId = await getCurrentCompanyId();
  const query = supabase
    .from("leave_requests")
    .select(
      "id, leave_type, start_date, end_date, days_requested, status, reason, created_at, employees(employee_number, first_name, last_name, photo_url, departments!department_id(name))"
    )
    .eq("company_id", companyId ?? "")
    .order("created_at", { ascending: false });

  const { data: requests } = isHr ? await query : await query.eq("employee_id", employee?.id ?? "");

  const rows: LeaveRequestRow[] = (requests ?? []).map((r) => {
    const emp = r.employees as unknown as {
      employee_number: string;
      first_name: string;
      last_name: string;
      photo_url: string | null;
      departments: { name: string } | null;
    } | null;
    return {
      id: r.id,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "—",
      employee_number: emp?.employee_number ?? "—",
      department_name: emp?.departments?.name ?? null,
      photo_url: emp?.photo_url ?? null,
      leave_type: r.leave_type,
      start_date: r.start_date,
      end_date: r.end_date,
      days_requested: Number(r.days_requested),
      reason: r.reason,
      status: r.status,
      applied_at: r.created_at,
    };
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthRows = rows.filter((r) => new Date(r.applied_at) >= monthStart);
  const lastMonthRows = rows.filter((r) => new Date(r.applied_at) >= lastMonthStart && new Date(r.applied_at) < monthStart);

  const countByStatus = (list: LeaveRequestRow[], status: LeaveRequestStatus) => list.filter((r) => r.status === status).length;
  const monthOverMonthPct =
    lastMonthRows.length > 0 ? ((thisMonthRows.length - lastMonthRows.length) / lastMonthRows.length) * 100 : null;

  const today = now.toISOString().slice(0, 10);
  const { count: todaysAbsences } = await supabase
    .from("leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId ?? "")
    .eq("status", "approved")
    .lte("start_date", today)
    .gte("end_date", today);

  const { data: balances } = employee
    ? await supabase.from("leave_balances").select("*").eq("employee_id", employee.id).eq("year", now.getFullYear())
    : { data: [] };

  return (
    <LeaveRequestDialogProvider>
      <div className="space-y-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Leave Management</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">Leave Dashboard</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
            <p className="text-sm text-muted-foreground">Manage and track employee leave requests.</p>
          </div>
          <NewLeaveRequestButton />
        </div>

        <LeaveStatCards
          total={thisMonthRows.length}
          approved={countByStatus(thisMonthRows, "approved")}
          pending={countByStatus(thisMonthRows, "pending")}
          rejected={countByStatus(thisMonthRows, "rejected")}
          todaysAbsences={todaysAbsences ?? 0}
          monthOverMonthPct={monthOverMonthPct}
        />

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Card>
              <CardContent className="p-6">
                <LeaveTable requests={rows} isHr={isHr} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <LeaveBalanceSummary balances={(balances ?? []).map((b) => ({ leave_type: b.leave_type, entitled_days: Number(b.entitled_days), used_days: Number(b.used_days) }))} />
            <LeaveQuickActions />
          </div>
        </div>
      </div>
    </LeaveRequestDialogProvider>
  );
}

export const dynamic = "force-dynamic";
