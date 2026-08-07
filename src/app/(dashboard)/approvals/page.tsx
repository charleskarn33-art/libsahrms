import Link from "next/link";
import { CalendarDays, HandCoins, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types/database";

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const role = (profile?.role ?? "employee") as UserRole;

  const isHr = ["super_admin", "hr_manager"].includes(role);
  const isFinance = ["super_admin", "finance_manager"].includes(role);
  const isDirector = ["super_admin", "managing_director"].includes(role);
  const isPayrollStaff = ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director"].includes(role);

  const companyId = await getCurrentCompanyId();

  const [{ data: leaveRequests }, { data: loans }, { data: financePeriods }, { data: directorPeriods }] = await Promise.all([
    isHr
      ? supabase
          .from("leave_requests")
          .select("id, leave_type, days_requested, employees(first_name, last_name)")
          .eq("company_id", companyId ?? "")
          .eq("status", "pending")
      : Promise.resolve({ data: [] }),
    isPayrollStaff
      ? supabase
          .from("loans")
          .select("id, loan_type, principal_amount, employees(first_name, last_name)")
          .eq("company_id", companyId ?? "")
          .eq("status", "pending")
      : Promise.resolve({ data: [] }),
    isFinance
      ? supabase
          .from("payroll_periods")
          .select("id, period_label")
          .eq("company_id", companyId ?? "")
          .eq("approval_stage", "finance_review")
      : Promise.resolve({ data: [] }),
    isDirector
      ? supabase
          .from("payroll_periods")
          .select("id, period_label")
          .eq("company_id", companyId ?? "")
          .eq("approval_stage", "director_approval")
      : Promise.resolve({ data: [] }),
  ]);

  const payrollPending = [...(financePeriods ?? []), ...(directorPeriods ?? [])];
  const totalPending = (leaveRequests?.length ?? 0) + (loans?.length ?? 0) + payrollPending.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">{totalPending} items awaiting your decision.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {isFinance || isDirector ? (
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Payroll Periods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {payrollPending.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
              {payrollPending.map((p) => (
                <Link
                  key={p.id}
                  href="/payroll/periods"
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-muted"
                >
                  {p.period_label}
                  <Badge variant="warning">Review</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {isHr && (
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <CalendarDays className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Leave Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(leaveRequests ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
              {(leaveRequests ?? []).map((r) => {
                const emp = r.employees as unknown as { first_name: string; last_name: string } | null;
                return (
                  <Link
                    key={r.id}
                    href="/leave"
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-muted"
                  >
                    <span>
                      {emp ? `${emp.first_name} ${emp.last_name}` : "—"} · <span className="capitalize">{r.leave_type}</span>
                    </span>
                    <Badge variant="warning">{r.days_requested}d</Badge>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}

        {isPayrollStaff && (
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <HandCoins className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Loans &amp; Advances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(loans ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
              {(loans ?? []).map((l) => {
                const emp = l.employees as unknown as { first_name: string; last_name: string } | null;
                return (
                  <Link
                    key={l.id}
                    href="/loans"
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-muted"
                  >
                    {emp ? `${emp.first_name} ${emp.last_name}` : "—"}
                    <Badge variant="warning">Review</Badge>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
