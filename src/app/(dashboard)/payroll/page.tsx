import { ChevronRight, CalendarDays, Users, Wallet, ReceiptText, PiggyBank } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { StatCard } from "@/components/dashboard/stat-card";
import { PayrollWorkflow } from "@/components/dashboard/payroll-workflow";
import { PayrollPeriodsTable, type PayrollPeriodRow } from "@/components/payroll/payroll-periods-table";
import { DepartmentPayrollSummary, type DepartmentPayrollRow } from "@/components/payroll/department-payroll-summary";
import { DeductionsBreakdown } from "@/components/payroll/deductions-breakdown";
import { PayrollSummaryCard } from "@/components/payroll/payroll-summary-card";
import { PayrollQuickActions } from "@/components/payroll/payroll-quick-actions";
import { PayrollActivities, type ActivityItem } from "@/components/payroll/payroll-activities";
import { CreatePeriodDialog } from "@/components/payroll/create-period-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PayrollStatus } from "@/types/database";

const ACTIVITY_COLOR: Record<string, string> = {
  payroll_period_created: "bg-secondary",
  payroll_generated: "bg-warning",
  payroll_finance_approved: "bg-primary",
  payroll_finance_rejected: "bg-danger",
  payroll_director_approved: "bg-primary",
  payroll_director_rejected: "bg-danger",
  payroll_locked: "bg-accent",
  payroll_unlocked: "bg-muted-foreground",
};

const ACTIVITY_LABEL: Record<string, string> = {
  payroll_period_created: "Payroll created",
  payroll_generated: "Submitted for Finance Review",
  payroll_finance_approved: "Finance Review Approved",
  payroll_finance_rejected: "Finance Review Rejected",
  payroll_director_approved: "Director Approval Approved",
  payroll_director_rejected: "Director Approval Rejected",
  payroll_locked: "Payroll Locked",
  payroll_unlocked: "Payroll Unlocked",
};

export default async function PayrollDashboardPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const [{ data: periods }, { data: summaries }] = await Promise.all([
    supabase
      .from("payroll_periods")
      .select("*, profiles!created_by(full_name, role, avatar_url)")
      .eq("company_id", companyId ?? "")
      .order("period_start", { ascending: false }),
    supabase.from("v_payroll_period_summary").select("*").eq("company_id", companyId ?? ""),
  ]);

  const summaryMap = new Map((summaries ?? []).map((s) => [s.payroll_period_id, s]));
  const currentPeriod = (periods ?? [])[0];
  const currentSummary = currentPeriod ? summaryMap.get(currentPeriod.id) : undefined;

  const periodRows: PayrollPeriodRow[] = (periods ?? []).map((p) => {
    const creator = p.profiles as unknown as { full_name: string; role: string; avatar_url: string | null } | null;
    const summary = summaryMap.get(p.id);
    return {
      id: p.id,
      period_label: p.period_label,
      period_start: p.period_start,
      period_end: p.period_end,
      status: p.status as PayrollStatus,
      employee_count: summary?.employee_count ?? 0,
      total_gross: Number(summary?.total_gross ?? 0),
      total_deductions: Number(summary?.total_gross ?? 0) - Number(summary?.total_net ?? 0),
      total_net: Number(summary?.total_net ?? 0),
      created_by_name: creator?.full_name ?? null,
      created_by_role: creator?.role ?? null,
      created_by_avatar: creator?.avatar_url ?? null,
      created_at: p.created_at,
    };
  });

  const { data: currentItems } = currentPeriod
    ? await supabase
        .from("payroll_items")
        .select("gross_salary, total_deductions, net_salary, employee_nasscorp, income_tax, loan_deductions, other_deductions, orange_money_fee, employees(department_id, departments!department_id(name))")
        .eq("payroll_period_id", currentPeriod.id)
    : { data: [] };

  const deptTotals = new Map<string, DepartmentPayrollRow>();
  let whtTotal = 0;
  let nasscorpTotal = 0;
  let loansTotal = 0;
  let otherTotal = 0;

  for (const item of currentItems ?? []) {
    const emp = item.employees as unknown as { department_id: string | null; departments: { name: string } | null } | null;
    const deptName = emp?.departments?.name ?? "Unassigned";
    const existing = deptTotals.get(deptName) ?? { department_name: deptName, employee_count: 0, gross: 0, deductions: 0, net: 0, percent: 0 };
    existing.employee_count += 1;
    existing.gross += Number(item.gross_salary);
    existing.deductions += Number(item.total_deductions);
    existing.net += Number(item.net_salary);
    deptTotals.set(deptName, existing);

    whtTotal += Number(item.income_tax);
    nasscorpTotal += Number(item.employee_nasscorp);
    loansTotal += Number(item.loan_deductions);
    otherTotal += Number(item.other_deductions) + Number(item.orange_money_fee);
  }

  const totalNetForPct = Number(currentSummary?.total_net ?? 0) || 1;
  const departmentRows = Array.from(deptTotals.values())
    .map((d) => ({ ...d, percent: (d.net / totalNetForPct) * 100 }))
    .sort((a, b) => b.net - a.net);

  const { data: auditLogs } = companyId
    ? await supabase
        .from("audit_logs")
        .select("id, action, actor_email, entity_id, created_at")
        .eq("company_id", companyId)
        .eq("entity_type", "payroll_period")
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: [] };

  const periodLabelById = new Map((periods ?? []).map((p) => [p.id, p.period_label]));
  const activities: ActivityItem[] = (auditLogs ?? []).map((log) => {
    const periodLabel = log.entity_id ? periodLabelById.get(log.entity_id) : undefined;
    const base = ACTIVITY_LABEL[log.action] ?? log.action.replace(/_/g, " ");
    return {
      id: log.id,
      label: periodLabel ? `${base} for ${periodLabel}` : base,
      actorName: log.actor_email,
      createdAt: log.created_at,
      color: ACTIVITY_COLOR[log.action] ?? "bg-muted-foreground",
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>Payroll</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Payroll Dashboard</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage payroll processes, approvals and payments.</p>
        </div>
        <CreatePeriodDialog />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          icon={CalendarDays}
          label="Current Period"
          value={currentPeriod?.period_label ?? "—"}
          sublabel={currentPeriod ? `${formatDate(currentPeriod.period_start)} - ${formatDate(currentPeriod.period_end)}` : undefined}
          tone="primary"
        />
        <StatCard icon={Users} label="Employees" value={String(currentSummary?.employee_count ?? 0)} sublabel="Total Employees" tone="accent" />
        <StatCard icon={Wallet} label="Total Gross Pay" value={formatCurrency(Number(currentSummary?.total_gross ?? 0))} sublabel="This Period" tone="secondary" />
        <StatCard
          icon={ReceiptText}
          label="Total Deductions"
          value={formatCurrency(Number(currentSummary?.total_gross ?? 0) - Number(currentSummary?.total_net ?? 0))}
          sublabel="This Period"
          tone="danger"
        />
        <StatCard icon={PiggyBank} label="Net Pay" value={formatCurrency(Number(currentSummary?.total_net ?? 0))} sublabel="This Period" tone="accent" />
      </div>

      <PayrollWorkflow
        currentStage={currentPeriod?.approval_stage ?? null}
        periodLabel={currentPeriod?.period_label ?? null}
        hrPreparedAt={currentPeriod?.hr_prepared_at ?? null}
        showHistoryLink
        detailsHref={currentPeriod ? `/payroll/periods/${currentPeriod.id}` : "/payroll/periods"}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <PayrollPeriodsTable periods={periodRows} />
          <div className="grid gap-6 lg:grid-cols-2">
            <DepartmentPayrollSummary periodLabel={currentPeriod?.period_label ?? "—"} rows={departmentRows} />
            <DeductionsBreakdown periodLabel={currentPeriod?.period_label ?? "—"} wht={whtTotal} nasscorp={nasscorpTotal} loans={loansTotal} other={otherTotal} />
          </div>
        </div>

        <div className="space-y-6">
          <PayrollSummaryCard
            periodLabel={currentPeriod?.period_label ?? "—"}
            totalEmployees={currentSummary?.employee_count ?? 0}
            totalGross={Number(currentSummary?.total_gross ?? 0)}
            totalWht={whtTotal}
            totalNasscorp={nasscorpTotal}
            totalLoans={loansTotal}
            otherDeductions={otherTotal}
            netPay={Number(currentSummary?.total_net ?? 0)}
          />
          <PayrollQuickActions />
          <PayrollActivities items={activities} />
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
