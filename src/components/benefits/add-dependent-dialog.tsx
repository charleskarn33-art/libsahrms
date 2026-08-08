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
import { benefitDependentSchema, type BenefitDependentInput } from "@/lib/validations/benefits";
import { addDependent } from "@/actions/benefits";

const RELATIONSHIPS = [
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "other", label: "Other" },
];

export function AddDependentDialog({ enrollmentId, employeeLabel }: { enrollmentId: string; employeeLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BenefitDependentInput>({
    resolver: zodResolver(benefitDependentSchema),
    defaultValues: { enrollment_id: enrollmentId },
  });

  async function onSubmit(values: BenefitDependentInput) {
    setSubmitting(true);
    const result = await addDependent(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Dependent added");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <UserPlus className="h-4 w-4" /> Add Dependent
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Dependent — {employeeLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("enrollment_id")} />
          <div>
            <Label className="mb-1.5 block">Full Name</Label>
            <Input {...register("full_name")} placeholder="e.g. Mary Doe" />
            {errors.full_name && <p className="mt-1 text-xs text-danger">{errors.full_name.message}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Relationship</Label>
            <Controller
              control={control}
              name="relationship"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.relationship && <p className="mt-1 text-xs text-danger">Select a relationship</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Date of Birth (optional)</Label>
            <Input type="date" {...register("date_of_birth")} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Dependent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
