"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { employeeSchema, type EmployeeInput } from "@/lib/validations/employee";
import { createEmployee, updateEmployee } from "@/actions/employees";

interface Option {
  id: string;
  label: string;
}

export function EmployeeForm({
  employeeId,
  defaultValues,
  departments,
  positions,
  supervisors,
}: {
  employeeId?: string;
  defaultValues?: Partial<EmployeeInput>;
  departments: Option[];
  positions: Option[];
  supervisors: Option[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employment_type: "full_time",
      employment_status: "active",
      payment_method: "bank",
      tax_status: "single",
      date_hired: new Date().toISOString().slice(0, 10),
      basic_salary: 0,
      transport_allowance: 0,
      housing_allowance: 0,
      relocation_allowance: 0,
      standard_bonus: 0,
      standard_commission: 0,
      ...defaultValues,
    },
  });

  async function onSubmit(values: EmployeeInput) {
    setSubmitting(true);
    const result = employeeId ? await updateEmployee(employeeId, values) : await createEmployee(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(employeeId ? "Employee updated" : "Employee created");
    router.push(employeeId ? `/employees/${employeeId}` : "/employees");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="personal">
        <TabsList className="flex-wrap">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
          <TabsTrigger value="banking">Banking &amp; Tax</TabsTrigger>
          <TabsTrigger value="emergency">Emergency &amp; Medical</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Employee Number" error={errors.employee_number?.message}>
            <Input {...register("employee_number")} placeholder="LIB-0142" />
          </Field>
          <Field label="First Name" error={errors.first_name?.message}>
            <Input {...register("first_name")} />
          </Field>
          <Field label="Middle Name">
            <Input {...register("middle_name")} />
          </Field>
          <Field label="Last Name" error={errors.last_name?.message}>
            <Input {...register("last_name")} />
          </Field>
          <Field label="Gender">
            <SelectField control={control} name="gender" options={["male", "female", "other"]} />
          </Field>
          <Field label="Date of Birth">
            <Input type="date" {...register("date_of_birth")} />
          </Field>
          <Field label="Marital Status">
            <SelectField control={control} name="marital_status" options={["single", "married", "divorced", "widowed"]} />
          </Field>
          <Field label="Nationality">
            <Input {...register("nationality")} />
          </Field>
          <Field label="County">
            <Input {...register("county")} />
          </Field>
          <Field label="District">
            <Input {...register("district")} />
          </Field>
          <Field label="Address" className="sm:col-span-2 lg:col-span-2">
            <Input {...register("address")} />
          </Field>
          <Field label="Phone">
            <Input {...register("phone")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </Field>
        </TabsContent>

        <TabsContent value="employment" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Department">
            <Controller
              control={control}
              name="department_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Position">
            <Controller
              control={control}
              name="position_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Supervisor">
            <Controller
              control={control}
              name="supervisor_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors
                      .filter((s) => s.id !== employeeId)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Employment Type">
            <SelectField
              control={control}
              name="employment_type"
              options={["full_time", "part_time", "contract", "intern", "temporary"]}
            />
          </Field>
          <Field label="Employment Status">
            <SelectField
              control={control}
              name="employment_status"
              options={["active", "on_leave", "suspended", "terminated", "resigned", "retired"]}
            />
          </Field>
          <Field label="Date Hired" error={errors.date_hired?.message}>
            <Input type="date" {...register("date_hired")} />
          </Field>
          <Field label="Salary Grade">
            <Input {...register("salary_grade")} placeholder="e.g. Grade 5" />
          </Field>
        </TabsContent>

        <TabsContent value="compensation" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Basic Salary" error={errors.basic_salary?.message}>
            <Input type="number" step="0.01" {...register("basic_salary")} />
          </Field>
          <Field label="Transport Allowance">
            <Input type="number" step="0.01" {...register("transport_allowance")} />
          </Field>
          <Field label="Housing Allowance">
            <Input type="number" step="0.01" {...register("housing_allowance")} />
          </Field>
          <Field label="Relocation Allowance">
            <Input type="number" step="0.01" {...register("relocation_allowance")} />
          </Field>
          <Field label="Standard Bonus">
            <Input type="number" step="0.01" {...register("standard_bonus")} />
          </Field>
          <Field label="Standard Commission">
            <Input type="number" step="0.01" {...register("standard_commission")} />
          </Field>
        </TabsContent>

        <TabsContent value="banking" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Payment Method">
            <SelectField control={control} name="payment_method" options={["bank", "orange_money", "cash"]} />
          </Field>
          <Field label="Bank Name">
            <Input {...register("bank_name")} />
          </Field>
          <Field label="Bank Account Number">
            <Input {...register("bank_account_number")} />
          </Field>
          <Field label="Orange Money Number">
            <Input {...register("orange_money_number")} />
          </Field>
          <Field label="TIN">
            <Input {...register("tin")} />
          </Field>
          <Field label="NASSCORP Number">
            <Input {...register("nasscorp_number")} />
          </Field>
          <Field label="Tax Status">
            <SelectField control={control} name="tax_status" options={["single", "married", "exempt"]} />
          </Field>
        </TabsContent>

        <TabsContent value="emergency" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Emergency Contact Name">
            <Input {...register("emergency_contact_name")} />
          </Field>
          <Field label="Emergency Contact Phone">
            <Input {...register("emergency_contact_phone")} />
          </Field>
          <Field label="Relationship">
            <Input {...register("emergency_contact_relationship")} />
          </Field>
          <Field label="Medical Information" className="sm:col-span-2 lg:col-span-3">
            <Input {...register("medical_information")} placeholder="Allergies, conditions, notes…" />
          </Field>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 border-t border-border pt-6">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {employeeId ? "Save Changes" : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

function SelectField<T extends Record<string, unknown>>({
  control,
  name,
  options,
}: {
  control: import("react-hook-form").Control<T>;
  name: import("react-hook-form").Path<T>;
  options: string[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={(field.value as string) || undefined} onValueChange={field.onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}
