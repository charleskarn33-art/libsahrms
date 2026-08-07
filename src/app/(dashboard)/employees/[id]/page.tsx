import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeDetail } from "@/components/employees/employee-detail";
import { EmployeeForm } from "@/components/employees/employee-form";
import type { Employee } from "@/types/database";

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const supabase = await createClient();

  const { data: employee } = await supabase.from("employees").select("*").eq("id", id).single();

  if (!employee) {
    notFound();
  }

  const emp = employee as Employee;

  const [{ data: departments }, { data: positions }, { data: employees }] = await Promise.all([
    supabase.from("departments").select("id, name").eq("company_id", emp.company_id).order("name"),
    supabase.from("positions").select("id, title").eq("company_id", emp.company_id).order("title"),
    supabase.from("employees").select("id, first_name, last_name").eq("company_id", emp.company_id).order("first_name"),
  ]);
  const departmentName = departments?.find((d) => d.id === emp.department_id)?.name;
  const positionTitle = positions?.find((p) => p.id === emp.position_id)?.title;
  const supervisor = employees?.find((e) => e.id === emp.supervisor_id);

  const isEditing = edit === "1";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/employees">
            <ArrowLeft className="h-4 w-4" /> Back to Employees
          </Link>
        </Button>
        {!isEditing && (
          <Button asChild>
            <Link href={`/employees/${id}?edit=1`}>
              <Pencil className="h-4 w-4" /> Edit Employee
            </Link>
          </Button>
        )}
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <EmployeeForm
              employeeId={id}
              defaultValues={{
                ...emp,
                middle_name: emp.middle_name ?? "",
                date_of_birth: emp.date_of_birth ?? "",
                nationality: emp.nationality ?? "",
                county: emp.county ?? "",
                district: emp.district ?? "",
                address: emp.address ?? "",
                phone: emp.phone ?? "",
                email: emp.email ?? "",
                emergency_contact_name: emp.emergency_contact_name ?? "",
                emergency_contact_phone: emp.emergency_contact_phone ?? "",
                emergency_contact_relationship: emp.emergency_contact_relationship ?? "",
                department_id: emp.department_id ?? "",
                position_id: emp.position_id ?? "",
                supervisor_id: emp.supervisor_id ?? "",
                salary_grade: emp.salary_grade ?? "",
                bank_name: emp.bank_name ?? "",
                bank_account_number: emp.bank_account_number ?? "",
                orange_money_number: emp.orange_money_number ?? "",
                tin: emp.tin ?? "",
                nasscorp_number: emp.nasscorp_number ?? "",
                medical_information: emp.medical_information ?? "",
                gender: emp.gender ?? undefined,
                marital_status: emp.marital_status ?? undefined,
              }}
              departments={(departments ?? []).map((d) => ({ id: d.id, label: d.name }))}
              positions={(positions ?? []).map((p) => ({ id: p.id, label: p.title }))}
              supervisors={(employees ?? []).map((e) => ({ id: e.id, label: `${e.first_name} ${e.last_name}` }))}
            />
          </CardContent>
        </Card>
      ) : (
        <EmployeeDetail
          employee={emp}
          departmentName={departmentName}
          positionTitle={positionTitle}
          supervisorName={supervisor ? `${supervisor.first_name} ${supervisor.last_name}` : undefined}
        />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
