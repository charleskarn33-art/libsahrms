import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeTable } from "@/components/employees/employee-table";
import { EmployeeStatCards } from "@/components/employees/employee-stat-cards";
import { ExportEmployeesButton } from "@/components/employees/export-employees-button";
import { ImportEmployeesDialog } from "@/components/employees/import-employees-dialog";
import type { EmployeeDirectoryRow } from "@/types/database";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const [{ data: employees }, { count: departmentCount }] = await Promise.all([
    supabase.from("v_employee_directory").select("*").eq("company_id", companyId ?? "").order("first_name", { ascending: true }),
    supabase.from("departments").select("id", { count: "exact", head: true }).eq("company_id", companyId ?? ""),
  ]);

  const rows = (employees ?? []) as EmployeeDirectoryRow[];
  const total = rows.length;
  const male = rows.filter((e) => e.gender === "male").length;
  const female = rows.filter((e) => e.gender === "female").length;
  const onProbation = rows.filter((e) => e.employment_status === "probation").length;
  const inactive = rows.filter((e) => !["active", "probation"].includes(e.employment_status)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>Employees</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Employee Database</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Database</h1>
          <p className="text-sm text-muted-foreground">Manage all employee information in the organization.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportEmployeesDialog />
          <ExportEmployeesButton employees={rows} />
          <Button asChild variant="gradient">
            <Link href="/employees/new">
              <Plus className="h-4 w-4" /> Add Employee
            </Link>
          </Button>
        </div>
      </div>

      <EmployeeStatCards
        total={total}
        male={male}
        female={female}
        onProbation={onProbation}
        inactive={inactive}
        departmentCount={departmentCount ?? 0}
      />

      <Card>
        <CardContent className="p-6">
          <EmployeeTable employees={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
