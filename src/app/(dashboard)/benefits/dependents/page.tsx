import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { DependentRelationship } from "@/types/database";

export default async function BenefitDependentsPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const { data: dependents } = await supabase
    .from("benefit_dependents")
    .select(
      "id, full_name, relationship, date_of_birth, benefit_enrollments!inner(company_id, employees(first_name, last_name, employee_number), benefit_plans(name))"
    )
    .eq("benefit_enrollments.company_id", companyId ?? "")
    .order("full_name");

  const rows = (dependents ?? []).map((d) => {
    const enrollment = d.benefit_enrollments as unknown as {
      employees: { first_name: string; last_name: string; employee_number: string } | null;
      benefit_plans: { name: string } | null;
    };
    return {
      id: d.id,
      fullName: d.full_name,
      relationship: d.relationship as DependentRelationship,
      dateOfBirth: d.date_of_birth,
      employeeLabel: enrollment.employees ? `${enrollment.employees.first_name} ${enrollment.employees.last_name}` : "—",
      employeeNumber: enrollment.employees?.employee_number ?? "—",
      planName: enrollment.benefit_plans?.name ?? "—",
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/benefits">Benefits</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Dependents</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dependents</h1>
          <p className="text-sm text-muted-foreground">Everyone covered under an employee&apos;s benefit enrollment.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/benefits/enrollments">Add via Enrollments</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0 pb-4 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dependent</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Benefit Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No dependents added yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {r.relationship}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.dateOfBirth ? formatDate(r.dateOfBirth) : "—"}</TableCell>
                  <TableCell>
                    <p className="leading-tight">{r.employeeLabel}</p>
                    <p className="text-xs text-muted-foreground">{r.employeeNumber}</p>
                  </TableCell>
                  <TableCell>{r.planName}</TableCell>
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
