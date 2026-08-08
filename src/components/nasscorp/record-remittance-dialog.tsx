"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { taxRemittanceSchema, type TaxRemittanceInput } from "@/lib/validations/tax-remittance";
import { recordTaxRemittance } from "@/actions/tax-remittance";

export function RecordRemittanceDialog({ periodId, periodLabel }: { periodId: string; periodLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaxRemittanceInput>({
    resolver: zodResolver(taxRemittanceSchema),
    defaultValues: { payroll_period_id: periodId, payment_date: new Date().toISOString().slice(0, 10) },
  });

  async function onSubmit(values: TaxRemittanceInput) {
    setSubmitting(true);
    const result = await recordTaxRemittance(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Remittance recorded");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckCircle2 className="h-4 w-4" /> Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Tax &amp; NASSCORP Remittance — {periodLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("payroll_period_id")} />
          <div>
            <Label className="mb-1.5 block">Payment Date</Label>
            <Input type="date" {...register("payment_date")} />
            {errors.payment_date && <p className="mt-1 text-xs text-danger">{errors.payment_date.message}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Receipt / Reference Number</Label>
            <Input {...register("receipt_reference")} placeholder="e.g. RCP-052026-001" />
            {errors.receipt_reference && <p className="mt-1 text-xs text-danger">{errors.receipt_reference.message}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Notes (optional)</Label>
            <Textarea {...register("notes")} placeholder="Any additional detail for the audit trail" rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Remittance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
