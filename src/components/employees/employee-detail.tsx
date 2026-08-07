import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmployeePhotoViewer } from "@/components/employees/employee-photo-viewer";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Employee, EmploymentStatus } from "@/types/database";

const STATUS_VARIANT: Record<EmploymentStatus, "success" | "warning" | "danger" | "outline"> = {
  active: "success",
  on_leave: "warning",
  suspended: "warning",
  terminated: "danger",
  resigned: "outline",
  retired: "outline",
};

export function EmployeeDetail({
  employee,
  departmentName,
  positionTitle,
  supervisorName,
}: {
  employee: Employee;
  departmentName?: string;
  positionTitle?: string;
  supervisorName?: string;
}) {
  const fullName = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(" ");
  const gross =
    employee.basic_salary +
    employee.transport_allowance +
    employee.housing_allowance +
    employee.relocation_allowance +
    employee.standard_bonus +
    employee.standard_commission;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <EmployeePhotoViewer photoUrl={employee.photo_url} name={fullName} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold">{fullName}</h2>
              <Badge variant={STATUS_VARIANT[employee.employment_status]} className="capitalize">
                {employee.employment_status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {employee.employee_number} · {positionTitle ?? "No position"} · {departmentName ?? "No department"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Gross Monthly Pay</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(gross)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Row label="Gender" value={employee.gender} />
            <Row label="Date of Birth" value={employee.date_of_birth ? formatDate(employee.date_of_birth) : undefined} />
            <Row label="Marital Status" value={employee.marital_status} />
            <Row label="Nationality" value={employee.nationality} />
            <Row label="County / District" value={[employee.county, employee.district].filter(Boolean).join(" / ")} />
            <Row label="Address" value={employee.address} />
            <Row label="Phone" value={employee.phone} />
            <Row label="Email" value={employee.email} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Row label="Department" value={departmentName} />
            <Row label="Position" value={positionTitle} />
            <Row label="Supervisor" value={supervisorName} />
            <Row label="Employment Type" value={employee.employment_type} />
            <Row label="Date Hired" value={formatDate(employee.date_hired)} />
            <Row label="Salary Grade" value={employee.salary_grade} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compensation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Row label="Basic Salary" value={formatCurrency(employee.basic_salary)} />
            <Row label="Transport Allowance" value={formatCurrency(employee.transport_allowance)} />
            <Row label="Housing Allowance" value={formatCurrency(employee.housing_allowance)} />
            <Row label="Relocation Allowance" value={formatCurrency(employee.relocation_allowance)} />
            <Row label="Standard Bonus" value={formatCurrency(employee.standard_bonus)} />
            <Row label="Standard Commission" value={formatCurrency(employee.standard_commission)} />
            <Separator className="my-2" />
            <Row label="Gross Monthly Pay" value={formatCurrency(gross)} strong />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Banking &amp; Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Row label="Payment Method" value={employee.payment_method.replace("_", " ")} />
            <Row label="Bank Name" value={employee.bank_name} />
            <Row label="Bank Account" value={employee.bank_account_number} />
            <Row label="Orange Money Number" value={employee.orange_money_number} />
            <Row label="TIN" value={employee.tin} />
            <Row label="NASSCORP Number" value={employee.nasscorp_number} />
            <Row label="Tax Status" value={employee.tax_status} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value?: string | null; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm capitalize">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-primary" : "font-medium"}>{value || "—"}</span>
    </div>
  );
}
