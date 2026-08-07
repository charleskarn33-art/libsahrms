import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreatePeriodDialog } from "@/components/payroll/create-period-dialog";
import { WorkflowActions } from "@/components/payroll/workflow-actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PayrollStatus, UserRole } from "@/types/database";

const STATUS_VARIANT: Record<PayrollStatus, "success" | "warning" | "default" | "danger" | "outline"> = {
  paid: "success",
  approved: "success",
  locked: "default",
  pending: "warning",
  draft: "outline",
  cancelled: "danger",
};

export default async function PayrollPeriodsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const role = (profile?.role ?? "employee") as UserRole;

  const companyId = await getCurrentCompanyId();
  const { data: periods } = await supabase
    .from("payroll_periods")
    .select("*")
    .eq("company_id", companyId ?? "")
    .order("period_start", { ascending: false });
  const { data: summaries } = await supabase.from("v_payroll_period_summary").select("*").eq("company_id", companyId ?? "");

  const summaryMap = new Map((summaries ?? []).map((s) => [s.payroll_period_id, s]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll Periods</h1>
          <p className="text-sm text-muted-foreground">HR prepares → Finance reviews → Director approves → Payroll locked.</p>
        </div>
        <CreatePeriodDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payroll Periods</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Total Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(periods ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No payroll periods yet — create one to get started.
                  </TableCell>
                </TableRow>
              )}
              {(periods ?? []).map((p) => {
                const summary = summaryMap.get(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.period_label}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(p.period_start)} – {formatDate(p.period_end)}
                    </TableCell>
                    <TableCell>{summary?.employee_count ?? 0}</TableCell>
                    <TableCell>{formatCurrency(Number(summary?.total_net ?? 0))}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[p.status as PayrollStatus]} className="capitalize">
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm capitalize text-muted-foreground">{p.approval_stage.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right">
                      {p.status !== "locked" && p.status !== "paid" && p.status !== "cancelled" ? (
                        <WorkflowActions periodId={p.id} stage={p.approval_stage} role={role} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
