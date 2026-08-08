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
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
} = {}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
    const result = await requestLeave(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Leave request submitted");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="gradient">
            <Plus className="h-4 w-4" /> New Leave Request
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
