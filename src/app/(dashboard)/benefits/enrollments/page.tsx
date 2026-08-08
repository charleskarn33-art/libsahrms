import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnrollEmployeeDialog } from "@/components/benefits/enroll-employee-dialog";
import { AddDependentDialog } from "@/components/benefits/add-dependent-dialog";
import { CancelEnrollmentButton } from "@/components/benefits/cancel-enrollment-button";
import { formatDate } from "@/lib/utils";
import type { BenefitEnrollmentStatus } from "@/types/database";

const STATUS_VARIANT: Record<BenefitEnrollmentStatus, "success" | "warning" | "outline"> = {
  active: "success",
  pending: "warning",
  cancelled: "outline",
};

export default async function BenefitEnrollmentsPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const [{ data: employees }, { data: plans }, { data: enrollments }] = await Promise.all([
    supabase.from("employees").select("id, first_name, last_name").eq("company_id", companyId ?? "").order("first_name"),
    supabase.from("benefit_plans").select("id, name").eq("company_id", companyId ?? "").eq("status", "active").order("name"),
    supabase
      .from("benefit_enrollments")
      .select("id, enrollment_date, coverage_start_date, status, employees(first_name, last_name, employee_number), benefit_plans(name)")
      .eq("company_id", companyId ?? "")
      .order("enrollment_date", { ascending: false }),
  ]);

  const employeeOptions = (employees ?? []).map((e) => ({ id: e.id, label: `${e.first_name} ${e.last_name}` }));
  const planOptions = (plans ?? []).map((p) => ({ id: p.id, label: p.name }));

  const rows = (enrollments ?? []).map((e) => {
    const emp = e.employees as unknown as { first_name: string; last_name: string; employee_number: string } | null;
    const plan = e.benefit_plans as unknown as { name: string } | null;
    return {
      id: e.id,
      employeeLabel: emp ? `${emp.first_name} ${emp.last_name}` : "—",
      employeeNumber: emp?.employee_number ?? "—",
      planName: plan?.name ?? "—",
      enrollmentDate: e.enrollment_date,
      coverageStart: e.coverage_start_date,
      status: e.status as BenefitEnrollmentStatus,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/benefits">Benefits</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Enrollments</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enrollments</h1>
          <p className="text-sm text-muted-foreground">Every employee&apos;s benefit plan enrollment.</p>
        </div>
        <EnrollEmployeeDialog employees={employeeOptions} plans={planOptions} />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0 pb-4 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Benefit Plan</TableHead>
                <TableHead>Enrollment Date</TableHead>
                <TableHead>Coverage Start</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No enrollments yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium leading-tight">{r.employeeLabel}</p>
                    <p className="text-xs text-muted-foreground">{r.employeeNumber}</p>
                  </TableCell>
                  <TableCell>{r.planName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.enrollmentDate)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.coverageStart ? formatDate(r.coverageStart) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <AddDependentDialog enrollmentId={r.id} employeeLabel={r.employeeLabel} />
                      {r.status === "active" && <CancelEnrollmentButton enrollmentId={r.id} />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
