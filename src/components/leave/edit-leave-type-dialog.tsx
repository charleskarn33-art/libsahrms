"use client";

import { useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { leaveTypeSettingsSchema, type LeaveTypeSettingsInput } from "@/lib/validations/leave-settings";
import { updateLeaveTypeSettings } from "@/actions/leave-settings";
import { leaveTypeLabel } from "@/lib/leave-types";

export function EditLeaveTypeDialog({ defaultValues, trigger }: { defaultValues: LeaveTypeSettingsInput; trigger: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LeaveTypeSettingsInput>({ resolver: zodResolver(leaveTypeSettingsSchema), defaultValues });

  async function onSubmit(values: LeaveTypeSettingsInput) {
    setSubmitting(true);
    const result = await updateLeaveTypeSettings(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Leave type updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {leaveTypeLabel(defaultValues.leave_type)}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Default Days</Label>
              <Input type="number" step="0.5" {...register("default_days")} />
              {errors.default_days && <p className="mt-1 text-xs text-danger">{errors.default_days.message}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block">Max Carry Forward</Label>
              <Input type="number" step="0.5" {...register("max_carry_forward_days")} />
            </div>
          </div>
          <Controller
            control={control}
            name="is_paid"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Paid</p>
                  <p className="text-xs text-muted-foreground">Counts toward payroll while on leave</p>
                </div>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Employees can request this leave type</p>
                </div>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
