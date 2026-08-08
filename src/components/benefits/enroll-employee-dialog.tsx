"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { benefitEnrollmentSchema, type BenefitEnrollmentInput } from "@/lib/validations/benefits";
import { enrollEmployee } from "@/actions/benefits";

export function EnrollEmployeeDialog({
  employees,
  plans,
}: {
  employees: { id: string; label: string }[];
  plans: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors },
  } = useForm<BenefitEnrollmentInput>({
    resolver: zodResolver(benefitEnrollmentSchema),
    defaultValues: { coverage_start_date: new Date().toISOString().slice(0, 10) },
  });

  async function onSubmit(values: BenefitEnrollmentInput) {
    setSubmitting(true);
    const result = await enrollEmployee(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Employee enrolled");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <UserPlus className="h-4 w-4" /> Enroll Employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll Employee in a Benefit Plan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Employee</Label>
            <Controller
              control={control}
              name="employee_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
            {errors.employee_id && <p className="mt-1 text-xs text-danger">Select an employee</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Benefit Plan</Label>
            <Controller
              control={control}
              name="benefit_plan_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.benefit_plan_id && <p className="mt-1 text-xs text-danger">Select a plan</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Coverage Start Date</Label>
            <Input type="date" {...register("coverage_start_date")} />
            {errors.coverage_start_date && <p className="mt-1 text-xs text-danger">{errors.coverage_start_date.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enroll
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
