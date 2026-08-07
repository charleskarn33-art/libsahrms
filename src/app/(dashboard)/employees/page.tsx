import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeTable } from "@/components/employees/employee-table";
import type { EmployeeDirectoryRow } from "@/types/database";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();
  const { data: employees } = await supabase
    .from("v_employee_directory")
    .select("*")
    .eq("company_id", companyId ?? "")
    .order("first_name", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage employee records, roles, and compensation.</p>
        </div>
        <Button asChild variant="gradient">
          <Link href="/employees/new">
            <Plus className="h-4 w-4" /> Add Employee
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <EmployeeTable employees={(employees ?? []) as EmployeeDirectoryRow[]} />
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
