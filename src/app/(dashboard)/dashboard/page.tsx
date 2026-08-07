import { Users, ClipboardCheck, CheckCircle2, Wallet, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { PayrollWorkflow } from "@/components/dashboard/payroll-workflow";
import { SalaryTrendChart } from "@/components/dashboard/salary-trend-chart";
import { RecentPayrolls } from "@/components/dashboard/recent-payrolls";
import { NasscorpSummary } from "@/components/dashboard/nasscorp-summary";
import { PayslipDistribution } from "@/components/dashboard/payslip-distribution";
import { Announcements } from "@/components/dashboard/announcements";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { formatCurrency } from "@/lib/utils";
import type { PayrollPeriodSummary } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalEmployees },
    { count: activeEmployees },
    { count: pendingLeave },
    { data: periodSummaries },
    { data: announcements },
  ] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("employment_status", "active"),
    supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("v_payroll_period_summary")
      .select("*")
      .order("payroll_period_id", { ascending: false })
      .limit(6),
    supabase.from("announcements").select("*").order("published_at", { ascending: false }).limit(3),
  ]);

  const summaries = (periodSummaries ?? []) as PayrollPeriodSummary[];
  const currentPeriod = summaries[0];

  const { data: currentPeriodRow } = currentPeriod
    ? await supabase.from("payroll_periods").select("*").eq("id", currentPeriod.payroll_period_id).single()
    : { data: null };

  const { data: deliveries } = currentPeriod
    ? await supabase
        .from("payslip_deliveries")
        .select("status, payslips!inner(payroll_period_id)")
        .eq("payslips.payroll_period_id", currentPeriod.payroll_period_id)
    : { data: [] };

  const sent = deliveries?.filter((d) => d.status === "delivered" || d.status === "opened" || d.status === "sent").length ?? 0;
  const failed = deliveries?.filter((d) => d.status === "failed").length ?? 0;
  const pendingDeliveries = deliveries?.filter((d) => d.status === "queued").length ?? 0;

  const trendData = [...summaries]
    .reverse()
    .map((s) => ({ month: s.period_label, total: Number(s.total_net) }));

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back! 👋</h1>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with LIBSA HR &amp; Payroll System</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-soft">
          {monthLabel}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={Users} label="Total Employees" value={String(totalEmployees ?? 0)} sublabel="Active Employees" tone="primary" />
        <StatCard
          icon={ClipboardCheck}
          label="Payroll Ready"
          value={String(activeEmployees ?? 0)}
          sublabel="Ready for approval"
          tone="secondary"
        />
        <StatCard
          icon={CheckCircle2}
          label="Payroll Processed"
          value={currentPeriodRow?.status === "paid" ? String(currentPeriod?.employee_count ?? 0) : "0"}
          sublabel={currentPeriodRow?.status === "paid" ? "Fully processed" : "Not processed"}
          tone="accent"
        />
        <StatCard
          icon={Wallet}
          label="Monthly Salary Cost"
          value={formatCurrency(Number(currentPeriod?.total_net ?? 0))}
          sublabel={`Total for ${currentPeriod?.period_label ?? monthLabel}`}
          tone="warning"
        />
        <StatCard
          icon={CalendarClock}
          label="Leave Requests"
          value={String(pendingLeave ?? 0)}
          sublabel="Pending requests"
          tone="danger"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PayrollWorkflow currentStage={currentPeriodRow?.approval_stage ?? null} periodLabel={currentPeriod?.period_label ?? null} />
        </div>
        <SalaryTrendChart data={trendData.length ? trendData : [{ month: monthLabel, total: 0 }]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentPayrolls periods={summaries} />
        <NasscorpSummary
          employeeNasscorp={Number(currentPeriod?.total_employee_nasscorp ?? 0)}
          employerNasscorp={Number(currentPeriod?.total_employer_nasscorp ?? 0)}
          taxableGross={Number(currentPeriod?.total_gross ?? 0)}
          totalWht={Number(currentPeriod?.total_income_tax ?? 0)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Announcements items={announcements ?? []} />
        </div>
        <PayslipDistribution total={currentPeriod?.employee_count ?? 0} sent={sent} pending={pendingDeliveries} failed={failed} />
      </div>

      <QuickActions />
    </div>
  );
}

export const dynamic = "force-dynamic";
