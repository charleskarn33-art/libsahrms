import Link from "next/link";
import { ChevronRight, Users, ShieldCheck, ClipboardList, Wallet, Heart, Smile, Eye, PiggyBank, Activity, Package, Plus, UserPlus, ListChecks, FileCheck2, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Announcements } from "@/components/dashboard/announcements";
import { EnrollmentOverviewDonut } from "@/components/benefits/enrollment-overview-donut";
import { ClaimsTrendChart } from "@/components/benefits/claims-trend-chart";
import { formatCurrency, initials } from "@/lib/utils";
import type { BenefitCategory, BenefitPlanStatus } from "@/types/database";

const CATEGORY_ICON: Record<BenefitCategory, typeof Heart> = {
  health: Heart,
  dental: Smile,
  vision: Eye,
  life: ShieldCheck,
  retirement: PiggyBank,
  wellness: Activity,
  other: Package,
};

const CATEGORY_LABEL: Record<BenefitCategory, string> = {
  health: "Health",
  dental: "Dental",
  vision: "Vision",
  life: "Life",
  retirement: "Retirement",
  wellness: "Wellness",
  other: "Other",
};

export default async function BenefitsOverviewPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const [{ data: company }, { count: totalEmployees }, { data: plans }, { data: enrollments }, { data: claims }, { data: announcements }] = await Promise.all([
    supabase.from("companies").select("currency").eq("id", companyId ?? "").maybeSingle(),
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId ?? "")
      .eq("employment_status", "active"),
    supabase
      .from("benefit_plans")
      .select("id, name, category, status, company_contribution, employee_contribution, benefit_providers(name)")
      .eq("company_id", companyId ?? "")
      .order("created_at"),
    supabase
      .from("benefit_enrollments")
      .select(
        "id, employee_id, status, enrollment_date, coverage_start_date, benefit_plan_id, employees(first_name, last_name, employee_number, photo_url), benefit_plans(name)"
      )
      .eq("company_id", companyId ?? "")
      .order("enrollment_date", { ascending: false }),
    supabase
      .from("benefit_claims")
      .select("id, status, submitted_at")
      .eq("company_id", companyId ?? "")
      .gte("submitted_at", `${new Date().getFullYear()}-01-01`),
    supabase.from("announcements").select("*").eq("company_id", companyId ?? "").order("published_at", { ascending: false }).limit(3),
  ]);

  const activePlans = (plans ?? []).filter((p) => p.status === "active");
  const totalAnnualCost = activePlans.reduce((sum, p) => sum + Number(p.company_contribution), 0);

  const activeEnrollments = (enrollments ?? []).filter((e) => e.status === "active");
  const enrolledEmployeeIds = new Set(activeEnrollments.map((e) => e.employee_id));

  const planEnrollmentCounts = new Map<string, number>();
  for (const e of activeEnrollments) {
    planEnrollmentCounts.set(e.benefit_plan_id, (planEnrollmentCounts.get(e.benefit_plan_id) ?? 0) + 1);
  }

  const planRows = (plans ?? []).map((p) => {
    const provider = p.benefit_providers as unknown as { name: string } | null;
    return {
      id: p.id,
      name: p.name,
      category: p.category as BenefitCategory,
      status: p.status as BenefitPlanStatus,
      providerName: provider?.name ?? "—",
      companyContribution: Number(p.company_contribution),
      employeeContribution: Number(p.employee_contribution),
      enrolledCount: planEnrollmentCounts.get(p.id) ?? 0,
    };
  });

  const donutPlans = activePlans.map((p) => ({ name: p.name, enrolledCount: planEnrollmentCounts.get(p.id) ?? 0 }));

  const recentEnrollments = (enrollments ?? []).slice(0, 5).map((e) => {
    const emp = e.employees as unknown as { first_name: string; last_name: string; employee_number: string; photo_url: string | null } | null;
    const plan = e.benefit_plans as unknown as { name: string } | null;
    return {
      id: e.id,
      employeeName: emp ? `${emp.first_name} ${emp.last_name}` : "—",
      employeeNumber: emp?.employee_number ?? "—",
      photoUrl: emp?.photo_url ?? null,
      planName: plan?.name ?? "—",
      status: e.status,
    };
  });

  const claimTotals = {
    total: (claims ?? []).length,
    approved: (claims ?? []).filter((c) => c.status === "approved").length,
    pending: (claims ?? []).filter((c) => c.status === "pending").length,
    rejected: (claims ?? []).filter((c) => c.status === "rejected").length,
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  const claimsTrend = monthNames.slice(0, currentMonth + 1).map((month, i) => ({
    month,
    count: (claims ?? []).filter((c) => new Date(c.submitted_at).getMonth() === i).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>Benefits</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Benefits Overview</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Benefits Overview</h1>
        <p className="text-sm text-muted-foreground">Manage employee benefits, enrollments and claims.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Users} label="Total Employees" value={String(totalEmployees ?? 0)} sublabel="100% of workforce" tone="accent" />
            <StatCard
              icon={ShieldCheck}
              label="Enrolled Employees"
              value={String(enrolledEmployeeIds.size)}
              sublabel={totalEmployees ? `${Math.round((enrolledEmployeeIds.size / totalEmployees) * 100)}% enrolled` : undefined}
              tone="secondary"
            />
            <StatCard icon={ClipboardList} label="Active Plans" value={String(activePlans.length)} sublabel="Across all categories" tone="primary" />
            <StatCard icon={Wallet} label="Total Annual Cost" value={formatCurrency(totalAnnualCost, company?.currency)} sublabel="Company contribution" tone="warning" />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Benefits Plan Summary</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/benefits/plans">View All Plans</Link>
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Company Contribution</TableHead>
                    <TableHead>Employee Contribution</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        No benefit plans yet.{" "}
                        <Link href="/benefits/plans" className="font-medium text-primary hover:underline">
                          Add your first plan
                        </Link>
                        .
                      </TableCell>
                    </TableRow>
                  )}
                  {planRows.map((p) => {
                    const Icon = CATEGORY_ICON[p.category];
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{CATEGORY_LABEL[p.category]}</TableCell>
                        <TableCell>{p.providerName}</TableCell>
                        <TableCell>
                          {p.enrolledCount}
                          {totalEmployees ? (
                            <span className="ml-1 text-xs text-muted-foreground">({Math.round((p.enrolledCount / totalEmployees) * 100)}%)</span>
                          ) : null}
                        </TableCell>
                        <TableCell>{formatCurrency(p.companyContribution, company?.currency)}</TableCell>
                        <TableCell>{formatCurrency(p.employeeContribution, company?.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "active" ? "success" : "outline"} className="capitalize">
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Recent Enrollments</CardTitle>
                <Link href="/benefits/enrollments" className="text-xs font-medium text-primary hover:underline">
                  View All
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentEnrollments.length === 0 && <p className="text-sm text-muted-foreground">No enrollments yet.</p>}
                {recentEnrollments.map((e) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={e.photoUrl ?? undefined} alt={e.employeeName} />
                      <AvatarFallback className="text-xs">{initials(e.employeeName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{e.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.planName} · {e.employeeNumber}
                      </p>
                    </div>
                    <Badge variant={e.status === "active" ? "success" : e.status === "pending" ? "warning" : "outline"} className="shrink-0 capitalize">
                      {e.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Claims Summary (This Year)</CardTitle>
                <Link href="/benefits/claims" className="text-xs font-medium text-primary hover:underline">
                  View All
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <ClaimStat label="Total Claims" value={claimTotals.total} tone="primary" />
                  <ClaimStat label="Approved" value={claimTotals.approved} tone="secondary" />
                  <ClaimStat label="Pending" value={claimTotals.pending} tone="warning" />
                  <ClaimStat label="Rejected" value={claimTotals.rejected} tone="danger" />
                </div>
              </CardContent>
            </Card>
          </div>

          <ClaimsTrendChart data={claimsTrend} />
        </div>

        <div className="space-y-6">
          <EnrollmentOverviewDonut totalEnrolled={enrolledEmployeeIds.size} totalEmployees={totalEmployees ?? 0} plans={donutPlans} />

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <QuickAction icon={Plus} label="Add New Benefit Plan" sublabel="Create a new benefit plan" href="/benefits/plans" />
              <QuickAction icon={UserPlus} label="Enroll Employee" sublabel="Enroll employee in a benefit plan" href="/benefits/enrollments" />
              <QuickAction icon={ListChecks} label="Manage Enrollments" sublabel="View and manage all enrollments" href="/benefits/enrollments" />
              <QuickAction icon={FileCheck2} label="Manage Claims" sublabel="Review and process benefit claims" href="/benefits/claims" />
              <QuickAction icon={Building2} label="Add Benefit Provider" sublabel="Add a new benefit provider" href="/benefits/providers" />
            </CardContent>
          </Card>

          <Announcements items={announcements ?? []} />
        </div>
      </div>
    </div>
  );
}

function ClaimStat({ label, value, tone }: { label: string; value: number; tone: "primary" | "secondary" | "warning" | "danger" }) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary-700",
    secondary: "bg-secondary/10 text-secondary",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <div className={`rounded-xl px-3 py-3 ${toneClasses[tone]}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, sublabel, href }: { icon: typeof Plus; label: string; sublabel: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export const dynamic = "force-dynamic";
