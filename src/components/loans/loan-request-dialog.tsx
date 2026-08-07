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
import { loanRequestSchema, type LoanRequestInput } from "@/lib/validations/loan";
import { requestLoan } from "@/actions/loans";

export function LoanRequestDialog({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<LoanRequestInput>({ resolver: zodResolver(loanRequestSchema) });

  async function onSubmit(values: LoanRequestInput) {
    setSubmitting(true);
    const result = await requestLoan(employeeId, values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Request submitted");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> Request Loan / Advance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Loan / Salary Advance Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Type</Label>
            <Controller
              control={control}
              name="loan_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="salary_advance">Salary Advance</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Principal Amount</Label>
              <Input type="number" step="0.01" {...register("principal_amount")} />
              {errors.principal_amount && <p className="mt-1 text-xs text-danger">{errors.principal_amount.message}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block">Monthly Deduction</Label>
              <Input type="number" step="0.01" {...register("monthly_deduction")} />
              {errors.monthly_deduction && <p className="mt-1 text-xs text-danger">{errors.monthly_deduction.message}</p>}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Notes</Label>
            <Input {...register("notes")} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
