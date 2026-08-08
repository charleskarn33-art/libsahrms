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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { benefitClaimSchema, type BenefitClaimInput } from "@/lib/validations/benefits";
import { submitClaim } from "@/actions/benefits";

export function SubmitClaimDialog({
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
  } = useForm<BenefitClaimInput>({ resolver: zodResolver(benefitClaimSchema) });

  async function onSubmit(values: BenefitClaimInput) {
    setSubmitting(true);
    const result = await submitClaim(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Claim submitted");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> File Claim
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File a Benefit Claim</DialogTitle>
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
            <Label className="mb-1.5 block">Amount Claimed</Label>
            <Input type="number" step="0.01" {...register("amount_claimed")} />
            {errors.amount_claimed && <p className="mt-1 text-xs text-danger">{errors.amount_claimed.message}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Description (optional)</Label>
            <Textarea {...register("description")} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Claim
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
