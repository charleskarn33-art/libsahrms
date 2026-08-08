"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { benefitProviderSchema, type BenefitProviderInput } from "@/lib/validations/benefits";
import { createBenefitProvider } from "@/actions/benefits";

export function CreateProviderDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BenefitProviderInput>({ resolver: zodResolver(benefitProviderSchema) });

  async function onSubmit(values: BenefitProviderInput) {
    setSubmitting(true);
    const result = await createBenefitProvider(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Benefit provider added");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> Add Benefit Provider
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Benefit Provider</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Provider Name</Label>
            <Input {...register("name")} placeholder="e.g. Jubilee Health" />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Contact Email</Label>
            <Input type="email" {...register("contact_email")} placeholder="contact@provider.com" />
            {errors.contact_email && <p className="mt-1 text-xs text-danger">{errors.contact_email.message}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Contact Phone</Label>
            <Input {...register("contact_phone")} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Provider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
