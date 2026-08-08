import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { UserRole } from "@/types/database";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    redirect("/login");
  }

  const companyContext = await getCurrentCompany();

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);

  const approvalsCount = companyContext ? await getApprovalsCount(companyContext.company.company_id, companyContext.company.role) : 0;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role={companyContext?.company.role ?? profile.role}
        currentCompany={companyContext?.company ?? null}
        companies={companyContext?.all ?? []}
        badgeCounts={{ approvals: approvalsCount }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} unreadCount={unreadCount ?? 0} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

async function getApprovalsCount(companyId: string, role: UserRole): Promise<number> {
  const supabase = await createClient();

  const isHr = ["super_admin", "hr_manager"].includes(role);
  const isFinance = ["super_admin", "finance_manager"].includes(role);
  const isDirector = ["super_admin", "managing_director"].includes(role);
  const isPayrollStaff = ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director"].includes(role);

  const [leaveCount, loanCount, financeCount, directorCount] = await Promise.all([
    isHr
      ? supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    isPayrollStaff
      ? supabase.from("loans").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    isFinance
      ? supabase.from("payroll_periods").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("approval_stage", "finance_review")
      : Promise.resolve({ count: 0 }),
    isDirector
      ? supabase.from("payroll_periods").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("approval_stage", "director_approval")
      : Promise.resolve({ count: 0 }),
  ]);

  return (leaveCount.count ?? 0) + (loanCount.count ?? 0) + (financeCount.count ?? 0) + (directorCount.count ?? 0);
}
