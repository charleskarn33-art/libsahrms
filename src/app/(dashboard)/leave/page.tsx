import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeaveRequestDialog } from "@/components/leave/leave-request-dialog";
import { LeaveReviewActions } from "@/components/leave/leave-review-actions";
import { formatDate } from "@/lib/utils";
import type { LeaveRequestStatus, UserRole } from "@/types/database";

const STATUS_VARIANT: Record<LeaveRequestStatus, "success" | "warning" | "danger" | "outline"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
  cancelled: "outline",
};

const HR_ROLES: UserRole[] = ["super_admin", "hr_manager"];

export default async function LeavePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const isHr = profile ? HR_ROLES.includes(profile.role as UserRole) : false;

  const { data: employee } = await supabase.from("employees").select("id").eq("profile_id", user?.id ?? "").maybeSingle();

  const companyId = await getCurrentCompanyId();
  const query = supabase
    .from("leave_requests")
    .select("id, leave_type, start_date, end_date, days_requested, status, reason, employees(first_name, last_name)")
    .eq("company_id", companyId ?? "")
    .order("created_at", { ascending: false });

  const { data: requests } = isHr ? await query : await query.eq("employee_id", employee?.id ?? "");

  const { data: balances } = employee
    ? await supabase.from("leave_balances").select("*").eq("employee_id", employee.id).eq("year", new Date().getFullYear())
    : { data: [] };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-sm text-muted-foreground">
            {isHr ? "Review and manage employee leave requests." : "Request leave and track your balance."}
          </p>
        </div>
        <LeaveRequestDialog />
      </div>

      {!isHr && (balances ?? []).length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(balances ?? []).map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <p className="text-xs capitalize text-muted-foreground">{b.leave_type} leave</p>
                <p className="mt-1 text-xl font-bold">{Number(b.entitled_days) - Number(b.used_days)} days</p>
                <p className="text-xs text-muted-foreground">of {b.entitled_days} entitled</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isHr ? "All Leave Requests" : "My Leave Requests"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                {isHr && <TableHead>Employee</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                {isHr && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(requests ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={isHr ? 6 : 4} className="py-10 text-center text-sm text-muted-foreground">
                    No leave requests yet.
                  </TableCell>
                </TableRow>
              )}
              {(requests ?? []).map((r) => {
                const emp = r.employees as unknown as { first_name: string; last_name: string } | null;
                return (
                  <TableRow key={r.id}>
                    {isHr && <TableCell className="font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</TableCell>}
                    <TableCell className="capitalize">{r.leave_type}</TableCell>
                    <TableCell>
                      {formatDate(r.start_date)} – {formatDate(r.end_date)}
                    </TableCell>
                    <TableCell>{r.days_requested}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status as LeaveRequestStatus]} className="capitalize">
                        {r.status}
                      </Badge>
                    </TableCell>
                    {isHr && <TableCell className="text-right">{r.status === "pending" && <LeaveReviewActions id={r.id} />}</TableCell>}
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
