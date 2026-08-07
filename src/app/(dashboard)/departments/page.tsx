import { Building2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DepartmentDialog } from "@/components/departments/department-dialog";
import { PositionDialog } from "@/components/departments/position-dialog";
import { formatCurrency } from "@/lib/utils";

export default async function DepartmentsPage() {
  const supabase = await createClient();

  const [{ data: headcount }, { data: positions }, { data: departments }, { data: employees }] = await Promise.all([
    supabase.from("v_department_headcount").select("*").order("department_name"),
    supabase.from("positions").select("id, title, salary_grade, min_salary, max_salary, departments(name)").order("title"),
    supabase.from("departments").select("id, name, description").order("name"),
    supabase.from("employees").select("id, first_name, last_name").order("first_name"),
  ]);

  const employeeOptions = (employees ?? []).map((e) => ({ id: e.id, label: `${e.first_name} ${e.last_name}` }));
  const departmentOptions = (departments ?? []).map((d) => ({ id: d.id, label: d.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments &amp; Positions</h1>
          <p className="text-sm text-muted-foreground">Organize your workforce into departments and job positions.</p>
        </div>
        <div className="flex gap-2">
          <PositionDialog departments={departmentOptions} />
          <DepartmentDialog employees={employeeOptions} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(headcount ?? []).map((d) => (
          <Card key={d.department_id}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{d.department_name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {d.active_headcount} employees
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Basic Payroll</p>
                <p className="text-sm font-semibold">{formatCurrency(Number(d.total_basic_salary))}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {(headcount ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No departments yet — add one to get started.</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Salary Grade</TableHead>
                <TableHead>Salary Range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(positions ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No positions yet.
                  </TableCell>
                </TableRow>
              )}
              {(positions ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{(p.departments as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                  <TableCell>{p.salary_grade ?? "—"}</TableCell>
                  <TableCell>
                    {p.min_salary || p.max_salary
                      ? `${formatCurrency(Number(p.min_salary ?? 0))} – ${formatCurrency(Number(p.max_salary ?? 0))}`
                      : "—"}
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
