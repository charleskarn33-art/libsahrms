import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeaveBalanceSummary } from "@/components/leave/leave-balance-summary";
import type { UserRole } from "@/types/database";

const HR_ROLES: UserRole[] = ["super_admin", "hr_manager"];

export default async function LeaveBalancePage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const isHr = profile ? HR_ROLES.includes(profile.role as UserRole) : false;

  const { data: employee } = await supabase.from("employees").select("id").eq("profile_id", user?.id ?? "").maybeSingle();
  const year = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/leave">
          <ArrowLeft className="h-4 w-4" /> Back to Leave Dashboard
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Balance</h1>
        <p className="text-sm text-muted-foreground">{isHr ? `All employee leave balances for ${year}.` : `Your leave balance for ${year}.`}</p>
      </div>

      {isHr ? (
        <HrBalanceTable companyId={companyId ?? ""} year={year} />
      ) : (
        <SelfBalance employeeId={employee?.id ?? null} year={year} />
      )}
    </div>
  );
}

async function SelfBalance({ employeeId, year }: { employeeId: string | null; year: number }) {
  const supabase = await createClient();
  const { data: balances } = employeeId
    ? await supabase.from("leave_balances").select("*").eq("employee_id", employeeId).eq("year", year)
    : { data: [] };

  return (
    <div className="max-w-md">
      <LeaveBalanceSummary
        balances={(balances ?? []).map((b) => ({ leave_type: b.leave_type, entitled_days: Number(b.entitled_days), used_days: Number(b.used_days) }))}
      />
    </div>
  );
}

async function HrBalanceTable({ companyId, year }: { companyId: string; year: number }) {
  const supabase = await createClient();
  const { data: balances } = await supabase
    .from("leave_balances")
    .select("leave_type, entitled_days, used_days, employees(employee_number, first_name, last_name)")
    .eq("company_id", companyId)
    .eq("year", year)
    .order("employee_id");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Leave Balances</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Leave Type</TableHead>
              <TableHead>Entitled</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(balances ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No leave balances configured yet.
                </TableCell>
              </TableRow>
            )}
            {(balances ?? []).map((b, idx) => {
              const emp = b.employees as unknown as { employee_number: string; first_name: string; last_name: string } | null;
              return (
                <TableRow key={idx}>
                  <TableCell>
                    <p className="font-medium leading-tight">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</p>
                    <p className="text-xs text-muted-foreground">{emp?.employee_number}</p>
                  </TableCell>
                  <TableCell className="capitalize">{b.leave_type.replace("_", " ")}</TableCell>
                  <TableCell>{b.entitled_days}</TableCell>
                  <TableCell>{b.used_days}</TableCell>
                  <TableCell className="font-medium">{Number(b.entitled_days) - Number(b.used_days)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export const dynamic = "force-dynamic";
