"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { companySettingsSchema, type CompanySettingsInput } from "@/lib/validations/settings";
import { updateCompanySettings } from "@/actions/settings";

export function CompanySettingsForm({ id, defaultValues }: { id: string; defaultValues: CompanySettingsInput }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanySettingsInput>({ resolver: zodResolver(companySettingsSchema), defaultValues });

  async function onSubmit(values: CompanySettingsInput) {
    setSubmitting(true);
    const result = await updateCompanySettings(id, values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block">Company Name</Label>
          <Input {...register("company_name")} />
          {errors.company_name && <p className="mt-1 text-xs text-danger">{errors.company_name.message}</p>}
        </div>
        <div>
          <Label className="mb-1.5 block">Currency</Label>
          <Input {...register("currency")} />
        </div>
        <div>
          <Label className="mb-1.5 block">Company Email</Label>
          <Input type="email" {...register("email")} />
        </div>
        <div>
          <Label className="mb-1.5 block">Phone</Label>
          <Input {...register("phone")} />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block">Address</Label>
          <Input {...register("address")} />
        </div>
        <div>
          <Label className="mb-1.5 block">Company TIN</Label>
          <Input {...register("tin")} />
        </div>
        <div>
          <Label className="mb-1.5 block">NASSCORP Employer Number</Label>
          <Input {...register("nasscorp_employer_number")} />
        </div>
        <div>
          <Label className="mb-1.5 block">Employee NASSCORP Rate (%)</Label>
          <Input type="number" step="0.01" {...register("employee_nasscorp_rate")} />
        </div>
        <div>
          <Label className="mb-1.5 block">Employer NASSCORP Rate (%)</Label>
          <Input type="number" step="0.01" {...register("employer_nasscorp_rate")} />
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-6">
        <Button type="submit" variant="gradient" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </form>
  );
}
