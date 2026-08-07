"use client";

import { useState } from "react";
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
import { payrollPeriodSchema, type PayrollPeriodInput } from "@/lib/validations/payroll";
import { createPayrollPeriod } from "@/actions/payroll";

export function CreatePeriodDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PayrollPeriodInput>({ resolver: zodResolver(payrollPeriodSchema), defaultValues: { frequency: "monthly" } });

  async function onSubmit(values: PayrollPeriodInput) {
    setSubmitting(true);
    const result = await createPayrollPeriod(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Payroll period created");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> New Payroll Period
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Payroll Period</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Label</Label>
            <Input {...register("period_label")} placeholder="e.g. August 2026" />
            {errors.period_label && <p className="mt-1 text-xs text-danger">{errors.period_label.message}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Frequency</Label>
            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Period Start</Label>
              <Input type="date" {...register("period_start")} />
              {errors.period_start && <p className="mt-1 text-xs text-danger">{errors.period_start.message}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block">Period End</Label>
              <Input type="date" {...register("period_end")} />
              {errors.period_end && <p className="mt-1 text-xs text-danger">{errors.period_end.message}</p>}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Payment Date</Label>
            <Input type="date" {...register("payment_date")} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Period
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
