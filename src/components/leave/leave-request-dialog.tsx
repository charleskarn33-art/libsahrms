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
import { leaveRequestSchema, type LeaveRequestInput } from "@/lib/validations/leave";
import { requestLeave } from "@/actions/leave";

const LEAVE_TYPES = ["annual", "sick", "compassionate", "maternity", "paternity", "emergency", "unpaid"];

export function LeaveRequestDialog({
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  employeeOptions,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  /** When provided (HR/Admin), the dialog lets the caller pick any employee and records the leave as already approved. */
  employeeOptions?: { id: string; label: string }[];
} = {}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isHrMode = !!employeeOptions?.length;

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<LeaveRequestInput>({ resolver: zodResolver(leaveRequestSchema) });

  async function onSubmit(values: LeaveRequestInput) {
    if (isHrMode && !values.employee_id) {
      toast.error("Select an employee");
      return;
    }

    setSubmitting(true);
    const result = await requestLeave(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(isHrMode ? "Leave recorded" : "Leave request submitted");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="gradient">
            <Plus className="h-4 w-4" /> {isHrMode ? "Set Leave for Employee" : "New Leave Request"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isHrMode ? "Set Leave for Employee" : "New Leave Request"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isHrMode && (
            <div>
              <Label className="mb-1.5 block">Employee</Label>
              <Controller
                control={control}
                name="employee_id"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeOptions!.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
          <div>
            <Label className="mb-1.5 block">Leave Type</Label>
            <Controller
              control={control}
              name="leave_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.leave_type && <p className="mt-1 text-xs text-danger">{errors.leave_type.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Start Date</Label>
              <Input type="date" {...register("start_date")} />
              {errors.start_date && <p className="mt-1 text-xs text-danger">{errors.start_date.message}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block">End Date</Label>
              <Input type="date" {...register("end_date")} />
              {errors.end_date && <p className="mt-1 text-xs text-danger">{errors.end_date.message}</p>}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Reason</Label>
            <Input {...register("reason")} placeholder="Optional" />
          </div>
          {isHrMode && (
            <p className="text-xs text-muted-foreground">
              This records the leave as already approved and deducts it from the employee&apos;s balance immediately.
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isHrMode ? "Save Leave Record" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
