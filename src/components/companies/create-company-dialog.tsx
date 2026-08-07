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
import { companySchema, type CompanyInput } from "@/lib/validations/company";
import { createCompany } from "@/actions/companies";
import { setCurrentCompany } from "@/actions/company";

export function CreateCompanyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: { currency: "LRD", employee_nasscorp_rate: 4, employer_nasscorp_rate: 6 },
  });

  async function onSubmit(values: CompanyInput) {
    setSubmitting(true);
    const result = await createCompany(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Company created");
    reset();
    setOpen(false);
    if (result.data?.id) {
      await setCurrentCompany(result.data.id);
    }
    router.push(`/companies/${result.data?.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Client Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Company Name</Label>
            <Input {...register("name")} placeholder="e.g. Acme Logistics" />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="mb-1.5 block">Currency</Label>
              <Input {...register("currency")} />
            </div>
            <div>
              <Label className="mb-1.5 block">Employee NASSCORP %</Label>
              <Input type="number" step="0.01" {...register("employee_nasscorp_rate")} />
            </div>
            <div>
              <Label className="mb-1.5 block">Employer NASSCORP %</Label>
              <Input type="number" step="0.01" {...register("employer_nasscorp_rate")} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            You&apos;ll be added as this company&apos;s HR Manager automatically. You can invite more staff and fine-tune
            settings afterward.
          </p>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Company
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
