"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leavePolicySchema, type LeavePolicyInput } from "@/lib/validations/leave-settings";
import { updateLeavePolicy } from "@/actions/leave-settings";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function LeavePolicyForm({ defaultValues }: { defaultValues: LeavePolicyInput }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LeavePolicyInput>({ resolver: zodResolver(leavePolicySchema), defaultValues });

  async function onSubmit(values: LeavePolicyInput) {
    setSubmitting(true);
    const result = await updateLeavePolicy(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Leave policy saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label className="mb-1.5 block">Leave Year Start</Label>
          <Controller
            control={control}
            name="leave_year_start_month"
            render={({ field }) => (
              <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Probation Period (Days)</Label>
          <Input type="number" {...register("probation_period_days")} />
          {errors.probation_period_days && <p className="mt-1 text-xs text-danger">{errors.probation_period_days.message}</p>}
        </div>
        <div>
          <Label className="mb-1.5 block">Minimum Service for Eligibility (Months)</Label>
          <Input type="number" {...register("min_service_months")} />
        </div>
        <div>
          <Label className="mb-1.5 block">Max Consecutive Leave Days</Label>
          <Input type="number" {...register("max_consecutive_leave_days")} />
          {errors.max_consecutive_leave_days && (
            <p className="mt-1 text-xs text-danger">{errors.max_consecutive_leave_days.message}</p>
          )}
        </div>
        <div>
          <Label className="mb-1.5 block">Leave Approval Required Before (Days)</Label>
          <Input type="number" {...register("approval_lead_days")} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name="allow_half_day"
          render={({ field }) => (
            <ToggleField
              label="Allow Half Day Leave"
              hint="Employees can request half-day increments"
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="allow_backdated"
          render={({ field }) => (
            <ToggleField
              label="Allow Backdated Leave"
              hint="Requests for dates already in the past"
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="carry_forward_enabled"
          render={({ field }) => (
            <ToggleField
              label="Carry Forward Leave"
              hint="Unused days roll into the next leave year"
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="encashment_enabled"
          render={({ field }) => (
            <ToggleField
              label="Encashment Allowed"
              hint="Unused leave can be paid out"
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" variant="gradient" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
