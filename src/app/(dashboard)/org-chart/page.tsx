import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { OrgChartClient, type DepartmentLegendItem, type OrgChartOverview } from "@/components/org-chart/org-chart-canvas";
import { buildDepartmentColorMap, OTHER_DEPARTMENT_COLOR } from "@/lib/department-colors";
import { buildOrgTree, type OrgEmployee } from "@/lib/org-chart";

type EmployeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  photo_url: string | null;
  employment_status: string;
  supervisor_id: string | null;
  department_id: string | null;
  positions: { title: string } | null;
  departments: { name: string } | null;
};

export default async function OrgChartPage() {
  const supabase = await createClient();
  const companyContext = await getCurrentCompany();
  const companyId = companyContext?.company.company_id ?? null;

  if (!companyContext) {
    return <div className="text-sm text-muted-foreground">Select a company first to view its org chart.</div>;
  }

  const [{ data: employeesRaw }, { data: departments }, { count: totalPositions }, { data: employeesForDialogs }] =
    await Promise.all([
      supabase
        .from("employees")
        .select(
          "id, first_name, last_name, employee_number, photo_url, employment_status, supervisor_id, department_id, positions(title), departments(name)"
        )
        .eq("company_id", companyId ?? "")
        .order("first_name"),
      supabase.from("departments").select("id, name").eq("company_id", companyId ?? "").order("name"),
      supabase.from("positions").select("id", { count: "exact", head: true }).eq("company_id", companyId ?? ""),
      supabase.from("employees").select("id, first_name, last_name").eq("company_id", companyId ?? "").order("first_name"),
    ]);

  const rows = (employeesRaw ?? []) as unknown as EmployeeRow[];

  const employees: OrgEmployee[] = rows.map((e) => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`,
    employeeNumber: e.employee_number,
    photoUrl: e.photo_url,
    title: e.positions?.title ?? null,
    departmentName: e.departments?.name ?? null,
    status: e.employment_status,
    supervisorId: e.supervisor_id,
  }));

  const headcountByDept = new Map<string, number>();
  for (const e of employees) {
    if (!e.departmentName) continue;
    headcountByDept.set(e.departmentName, (headcountByDept.get(e.departmentName) ?? 0) + 1);
  }
  const orderedDeptNames = Array.from(headcountByDept.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const departmentColors = buildDepartmentColorMap(orderedDeptNames);
  const legend: DepartmentLegendItem[] = orderedDeptNames.slice(0, 8).map((name) => ({
    name,
    color: departmentColors[name] ?? OTHER_DEPARTMENT_COLOR,
    count: headcountByDept.get(name) ?? 0,
  }));
  const otherDepartmentCount = orderedDeptNames.slice(8).reduce((sum, name) => sum + (headcountByDept.get(name) ?? 0), 0);

  const roots = buildOrgTree(employees);
  const managers = roots.flatMap(collectManagers);
  const averageSpanOfControl = managers.length
    ? Math.round((managers.reduce((sum, m) => sum + m.children.length, 0) / managers.length) * 10) / 10
    : 0;

  const overview: OrgChartOverview = {
    totalEmployees: employees.length,
    totalDepartments: (departments ?? []).length,
    totalPositions: totalPositions ?? 0,
    directReportsToCeo: roots[0]?.children.length ?? 0,
    averageSpanOfControl,
  };

  const employeeOptions = (employeesForDialogs ?? []).map((e) => ({ id: e.id, label: `${e.first_name} ${e.last_name}` }));
  const departmentOptions = (departments ?? []).map((d) => ({ id: d.id, label: d.name }));

  return (
    <OrgChartClient
      companyName={companyContext.company.name}
      employees={employees}
      departmentColors={departmentColors}
      legend={legend}
      otherDepartmentCount={otherDepartmentCount}
      overview={overview}
      employeeOptions={employeeOptions}
      departmentOptions={departmentOptions}
    />
  );
}

function collectManagers<T extends { children: T[] }>(node: T): T[] {
  const out = node.children.length ? [node] : [];
  return out.concat(node.children.flatMap(collectManagers));
}

export const dynamic = "force-dynamic";
