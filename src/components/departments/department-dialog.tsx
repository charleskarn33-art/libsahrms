"use client";

import { useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { departmentSchema, type DepartmentInput } from "@/lib/validations/department";
import { createDepartment, updateDepartment } from "@/actions/departments";

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  head_employee_id: string | null;
}

export function DepartmentDialog({
  employees,
  department,
  trigger,
}: {
  employees: { id: string; label: string }[];
  department?: DepartmentRecord;
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!department;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: department
      ? {
          name: department.name,
          code: department.code ?? "",
          description: department.description ?? "",
          head_employee_id: department.head_employee_id ?? "",
        }
      : undefined,
  });

  async function onSubmit(values: DepartmentInput) {
    setSubmitting(true);
    const result = isEdit ? await updateDepartment(department.id, values) : await createDepartment(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Department updated" : "Department created");
    if (!isEdit) reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="gradient">
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Department" : "New Department"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Name</Label>
            <Input {...register("name")} placeholder="e.g. Finance" />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Code</Label>
            <Input {...register("code")} placeholder="e.g. FIN" />
          </div>
          <div>
            <Label className="mb-1.5 block">Description</Label>
            <Input {...register("description")} />
          </div>
          <div>
            <Label className="mb-1.5 block">Department Head</Label>
            <Controller
              control={control}
              name="head_employee_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
