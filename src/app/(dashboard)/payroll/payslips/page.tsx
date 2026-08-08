import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PayslipPeriodSelector } from "@/components/payroll/payslip-period-selector";
import { GeneratePayslipsButton } from "@/components/payroll/generate-payslips-button";
import { PayslipBulkActions } from "@/components/payroll/payslip-bulk-actions";
import { PayslipRowActions } from "@/components/payroll/payslip-row-actions";
import { PayslipDistribution } from "@/components/dashboard/payslip-distribution";
import { formatDate, initials } from "@/lib/utils";
import type { PayslipDeliveryStatus, UserRole } from "@/types/database";

const PAYROLL_STAFF: UserRole[] = ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director"];

const DELIVERY_VARIANT: Record<PayslipDeliveryStatus, "success" | "warning" | "danger" | "outline"> = {
  delivered: "success",
  opened: "success",
  sent: "success",
  queued: "warning",
  failed: "danger",
};

export default async function PayslipsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodParam } = await searchParams;
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const role = (profile?.role ?? "employee") as UserRole;
  const isPayrollStaff = PAYROLL_STAFF.includes(role);

  const { data: eligiblePeriods } = await supabase
    .from("payroll_periods")
    .select("id, period_label, status, approval_stage")
    .eq("company_id", companyId ?? "")
    .in("status", ["locked", "paid"])
    .order("period_start", { ascending: false });

  const period = (eligiblePeriods ?? []).find((p) => p.id === periodParam) ?? eligiblePeriods?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>Payroll</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Payslips</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payslips</h1>
          <p className="text-sm text-muted-foreground">Generate, view, and email payslips for a locked payroll period.</p>
        </div>
        {eligiblePeriods && eligiblePeriods.length > 0 && period && (
          <PayslipPeriodSelector periods={eligiblePeriods} currentId={period.id} />
        )}
      </div>

      {!period ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold">No locked payroll periods yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Payslips can only be generated once a payroll period has gone through HR → Finance → Director approval and been
              locked.
            </p>
            <Button asChild variant="outline">
              <Link href="/payroll/periods">Go to Payroll Periods</Link>
            </Button>
          </CardContent>
        </Card>
      ) : period.approval_stage === "payroll_locked" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold">Payslips not generated yet for {period.period_label}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              This locks in the numbers from {period.period_label} and creates a PDF payslip for every employee in the
              period.
            </p>
            {isPayrollStaff && <GeneratePayslipsButton periodId={period.id} />}
          </CardContent>
        </Card>
      ) : (
        <PayslipsList periodId={period.id} periodLabel={period.period_label} isPayrollStaff={isPayrollStaff} canMarkProcessed={isPayrollStaff && period.approval_stage === "payslips_sent"} />
      )}
    </div>
  );
}

async function PayslipsList({
  periodId,
  periodLabel,
  isPayrollStaff,
  canMarkProcessed,
}: {
  periodId: string;
  periodLabel: string;
  isPayrollStaff: boolean;
  canMarkProcessed: boolean;
}) {
  const supabase = await createClient();

  const { data: payslips } = await supabase
    .from("payslips")
    .select(
      "id, payslip_number, generated_at, employee_id, employees(first_name, last_name, employee_number, photo_url), payslip_deliveries(id, status, recipient_email, sent_at, error_message)"
    )
    .eq("payroll_period_id", periodId)
    .order("generated_at");

  const rows = (payslips ?? []).map((p) => {
    const emp = p.employees as unknown as { first_name: string; last_name: string; employee_number: string; photo_url: string | null } | null;
    const delivery = (p.payslip_deliveries as unknown as {
      id: string;
      status: PayslipDeliveryStatus;
      recipient_email: string;
      sent_at: string | null;
      error_message: string | null;
    }[])?.[0];
    return { id: p.id, payslip_number: p.payslip_number, employee: emp, delivery };
  });

  const sentCount = rows.filter((r) => r.delivery && ["sent", "delivered", "opened"].includes(r.delivery.status)).length;
  const queuedCount = rows.filter((r) => r.delivery?.status === "queued").length;
  const failedCount = rows.filter((r) => r.delivery?.status === "failed").length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {isPayrollStaff && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{rows.length} payslip(s) for {periodLabel}</p>
            <PayslipBulkActions periodId={periodId} queuedCount={queuedCount} failedCount={failedCount} canMarkProcessed={canMarkProcessed} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Employee Payslips</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Payslip Number</TableHead>
                  <TableHead>Delivery Status</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No payslips found.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={r.employee?.photo_url ?? undefined} alt={r.employee?.first_name ?? ""} />
                          <AvatarFallback className="text-[10px]">{initials(`${r.employee?.first_name ?? ""} ${r.employee?.last_name ?? ""}`)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-tight">
                            {r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">{r.employee?.employee_number}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.payslip_number}</TableCell>
                    <TableCell>
                      {r.delivery ? (
                        <Badge variant={DELIVERY_VARIANT[r.delivery.status]} className="capitalize" title={r.delivery.error_message ?? undefined}>
                          {r.delivery.status}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No email</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.delivery?.sent_at ? formatDate(r.delivery.sent_at, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                    </TableCell>
                    <TableCell>
                      <PayslipRowActions payslipId={r.id} deliveryId={r.delivery?.id ?? null} status={r.delivery?.status ?? null} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <PayslipDistribution total={rows.length} sent={sentCount} pending={queuedCount} failed={failedCount} />
    </div>
  );
}

export const dynamic = "force-dynamic";
