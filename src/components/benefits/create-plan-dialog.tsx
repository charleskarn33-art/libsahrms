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
import { benefitPlanSchema, type BenefitPlanInput } from "@/lib/validations/benefits";
import { createBenefitPlan } from "@/actions/benefits";

const CATEGORIES = [
  { value: "health", label: "Health" },
  { value: "dental", label: "Dental" },
  { value: "vision", label: "Vision" },
  { value: "life", label: "Life" },
  { value: "retirement", label: "Retirement" },
  { value: "wellness", label: "Wellness" },
  { value: "other", label: "Other" },
];

export function CreatePlanDialog({ providers }: { providers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BenefitPlanInput>({ resolver: zodResolver(benefitPlanSchema) });

  async function onSubmit(values: BenefitPlanInput) {
    setSubmitting(true);
    const result = await createBenefitPlan(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Benefit plan created");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> Add New Benefit Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Benefit Plan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Plan Name</Label>
            <Input {...register("name")} placeholder="e.g. Health Insurance Plan" />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && <p className="mt-1 text-xs text-danger">{errors.category.message}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block">Provider</Label>
              <Controller
                control={control}
                name="provider_id"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Company Contribution (annual)</Label>
              <Input type="number" step="0.01" {...register("company_contribution")} />
              {errors.company_contribution && <p className="mt-1 text-xs text-danger">{errors.company_contribution.message}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block">Employee Contribution (annual)</Label>
              <Input type="number" step="0.01" {...register("employee_contribution")} />
              {errors.employee_contribution && <p className="mt-1 text-xs text-danger">{errors.employee_contribution.message}</p>}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Description (optional)</Label>
            <Textarea {...register("description")} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
