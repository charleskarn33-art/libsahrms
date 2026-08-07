import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoanRequestDialog } from "@/components/loans/loan-request-dialog";
import { LoanDecisionActions } from "@/components/loans/loan-decision-actions";
import { formatCurrency } from "@/lib/utils";
import type { LoanStatus, UserRole } from "@/types/database";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "outline" | "default"> = {
  pending: "warning",
  approved: "success",
  active: "default",
  completed: "success",
  rejected: "danger",
  cancelled: "outline",
};

const PAYROLL_ROLES: UserRole[] = ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director"];

export default async function LoansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const isPayrollStaff = profile ? PAYROLL_ROLES.includes(profile.role as UserRole) : false;

  const { data: employee } = await supabase.from("employees").select("id").eq("profile_id", user?.id ?? "").maybeSingle();

  const query = supabase
    .from("loans")
    .select("id, loan_type, principal_amount, monthly_deduction, balance_remaining, status, requested_at, employees(first_name, last_name)")
    .order("requested_at", { ascending: false });

  const { data: loans } = isPayrollStaff ? await query : await query.eq("employee_id", employee?.id ?? "");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loans &amp; Advances</h1>
          <p className="text-sm text-muted-foreground">
            {isPayrollStaff ? "Review and manage employee loans and salary advances." : "Request and track your loans and advances."}
          </p>
        </div>
        {employee && <LoanRequestDialog employeeId={employee.id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isPayrollStaff ? "All Loans & Advances" : "My Loans & Advances"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                {isPayrollStaff && <TableHead>Employee</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Monthly Deduction</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                {isPayrollStaff && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(loans ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={isPayrollStaff ? 7 : 5} className="py-10 text-center text-sm text-muted-foreground">
                    No loans or advances yet.
                  </TableCell>
                </TableRow>
              )}
              {(loans ?? []).map((l) => {
                const emp = l.employees as unknown as { first_name: string; last_name: string } | null;
                return (
                  <TableRow key={l.id}>
                    {isPayrollStaff && <TableCell className="font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</TableCell>}
                    <TableCell className="capitalize">{l.loan_type.replace("_", " ")}</TableCell>
                    <TableCell>{formatCurrency(Number(l.principal_amount))}</TableCell>
                    <TableCell>{formatCurrency(Number(l.monthly_deduction))}</TableCell>
                    <TableCell>{formatCurrency(Number(l.balance_remaining))}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[l.status as LoanStatus]} className="capitalize">
                        {l.status}
                      </Badge>
                    </TableCell>
                    {isPayrollStaff && <TableCell className="text-right">{l.status === "pending" && <LoanDecisionActions id={l.id} />}</TableCell>}
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
