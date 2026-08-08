import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, CalendarDays, ClipboardList, FileBarChart, Pencil, PartyPopper, UserCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeavePolicyForm } from "@/components/leave/leave-policy-form";
import { EditLeaveTypeDialog } from "@/components/leave/edit-leave-type-dialog";
import { BulkApplyEntitlementsButton } from "@/components/leave/bulk-apply-entitlements-button";
import { LEAVE_TYPES, LEAVE_TYPE_DEFAULTS, LEAVE_TYPE_META, DEFAULT_LEAVE_POLICY, leaveTypeLabel } from "@/lib/leave-types";
import type { LeaveType, LeaveTypeSettings, LeavePolicy } from "@/types/database";

export default async function LeaveSettingsPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();
  const year = new Date().getFullYear();

  if (!companyId) {
    return <div className="text-sm text-muted-foreground">Select a company first to manage leave settings.</div>;
  }

  const [{ data: typeSettingsRows }, { data: policyRow }, { count: totalEmployees }, { data: balances }] = await Promise.all([
    supabase.from("leave_type_settings").select("*").eq("company_id", companyId),
    supabase.from("leave_policies").select("*").eq("company_id", companyId).maybeSingle(),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.from("leave_balances").select("entitled_days, used_days").eq("company_id", companyId).eq("year", year),
  ]);

  const settingsByType = new Map((typeSettingsRows ?? []).map((r) => [r.leave_type as LeaveType, r as LeaveTypeSettings]));
  const leaveTypeRows = LEAVE_TYPES.map((type) => {
    const row = settingsByType.get(type);
    const defaults = LEAVE_TYPE_DEFAULTS[type];
    return {
      leave_type: type,
      default_days: row?.default_days ?? defaults.default_days,
      max_carry_forward_days: row?.max_carry_forward_days ?? defaults.max_carry_forward_days,
      is_paid: row?.is_paid ?? defaults.is_paid,
      is_active: row?.is_active ?? true,
    };
  });

  const policy: LeavePolicyInputWithoutCompany = policyRow
    ? {
        leave_year_start_month: (policyRow as LeavePolicy).leave_year_start_month,
        probation_period_days: (policyRow as LeavePolicy).probation_period_days,
        min_service_months: (policyRow as LeavePolicy).min_service_months,
        max_consecutive_leave_days: (policyRow as LeavePolicy).max_consecutive_leave_days,
        approval_lead_days: (policyRow as LeavePolicy).approval_lead_days,
        allow_half_day: (policyRow as LeavePolicy).allow_half_day,
        allow_backdated: (policyRow as LeavePolicy).allow_backdated,
        carry_forward_enabled: (policyRow as LeavePolicy).carry_forward_enabled,
        encashment_enabled: (policyRow as LeavePolicy).encashment_enabled,
      }
    : DEFAULT_LEAVE_POLICY;

  const totalEntitlementDays = leaveTypeRows.filter((r) => r.is_active).reduce((sum, r) => sum + r.default_days, 0);
  const totalTaken = (balances ?? []).reduce((sum, b) => sum + Number(b.used_days), 0);
  const totalEntitled = (balances ?? []).reduce((sum, b) => sum + Number(b.entitled_days), 0);
  const remaining = Math.max(0, totalEntitled - totalTaken);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Settings</h1>
        <p className="text-sm text-muted-foreground">Configure leave types, policies and approval workflows.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Leave Types</CardTitle>
                <CardDescription>Configure the defaults each leave type applies going forward.</CardDescription>
              </div>
              <BulkApplyEntitlementsButton year={year} />
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Default Days</TableHead>
                    <TableHead>Max Carry Forward</TableHead>
                    <TableHead>Paid / Unpaid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypeRows.map((row) => {
                    const meta = LEAVE_TYPE_META[row.leave_type];
                    return (
                      <TableRow key={row.leave_type}>
                        <TableCell className="font-medium">{leaveTypeLabel(row.leave_type)}</TableCell>
                        <TableCell className="text-muted-foreground">{meta.code}</TableCell>
                        <TableCell className="text-muted-foreground">{meta.category}</TableCell>
                        <TableCell>{row.default_days}</TableCell>
                        <TableCell>{row.max_carry_forward_days}</TableCell>
                        <TableCell>
                          <Badge variant={row.is_paid ? "success" : "outline"}>{row.is_paid ? "Paid" : "Unpaid"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.is_active ? "success" : "outline"}>{row.is_active ? "Active" : "Inactive"}</Badge>
                        </TableCell>
                        <TableCell>
                          <EditLeaveTypeDialog
                            defaultValues={row}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Policy Configuration</CardTitle>
              <CardDescription>Configure general leave policies for {year}.</CardDescription>
            </CardHeader>
            <CardContent>
              <LeavePolicyForm defaultValues={policy} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leave Approval Workflow</CardTitle>
              <CardDescription>How a leave request moves from submission to decision today.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <WorkflowStep icon={ClipboardList} title="Employee" subtitle="Submits request" />
                <WorkflowStep icon={UserCheck} title="HR Manager / Admin" subtitle="Reviews & approves or rejects" />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Leave requests are single-step today — any HR Manager or Admin on the company can approve or reject. A
                configurable multi-step chain (e.g. supervisor sign-off before HR) isn&apos;t available yet.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave Summary</CardTitle>
              <CardDescription>This Year ({year})</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SummaryRow icon={CalendarDays} label="Total Leave Types" value={LEAVE_TYPES.length} />
              <SummaryRow icon={ClipboardList} label="Total Entitlement Days" value={totalEntitlementDays} />
              <SummaryRow icon={Users} label="Total Employees" value={totalEmployees ?? 0} />
              <SummaryRow icon={FileBarChart} label="Total Leave Taken" value={`${totalTaken} Days`} />
              <SummaryRow icon={PartyPopper} label="Remaining Balance" value={`${remaining} Days`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <QuickLink href="/leave/holidays" icon={PartyPopper} title="Manage Holidays" subtitle="Public holiday calendar" />
              <QuickLink href="/leave/calendar" icon={CalendarDays} title="Leave Calendar" subtitle="View team leave calendar" />
              <QuickLink href="/leave/balance" icon={Users} title="Leave Balances" subtitle="Per-employee balances" />
              <QuickLink href="/reports/leave" icon={FileBarChart} title="Leave Reports" subtitle="Generate leave reports" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type LeavePolicyInputWithoutCompany = Omit<LeavePolicy, "company_id">;

function SummaryRow({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function WorkflowStep({ icon: Icon, title, subtitle }: { icon: ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export const dynamic = "force-dynamic";
