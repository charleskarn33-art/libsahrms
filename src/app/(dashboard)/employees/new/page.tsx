import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeForm } from "@/components/employees/employee-form";

export default async function NewEmployeePage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const [{ data: departments }, { data: positions }, { data: employees }] = await Promise.all([
    supabase.from("departments").select("id, name").eq("company_id", companyId ?? "").order("name"),
    supabase.from("positions").select("id, title").eq("company_id", companyId ?? "").order("title"),
    supabase.from("employees").select("id, first_name, last_name").eq("company_id", companyId ?? "").order("first_name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Employee</h1>
        <p className="text-sm text-muted-foreground">Create a new employee record.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            companyId={companyId ?? ""}
            departments={(departments ?? []).map((d) => ({ id: d.id, label: d.name }))}
            positions={(positions ?? []).map((p) => ({ id: p.id, label: p.title }))}
            supervisors={(employees ?? []).map((e) => ({ id: e.id, label: `${e.first_name} ${e.last_name}` }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
