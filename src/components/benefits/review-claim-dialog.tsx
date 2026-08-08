"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { claimReviewSchema, type ClaimReviewInput } from "@/lib/validations/benefits";
import { reviewClaim } from "@/actions/benefits";

export function ReviewClaimDialog({
  claimId,
  claimNumber,
  amountClaimed,
  decision,
}: {
  claimId: string;
  claimNumber: string;
  amountClaimed: number;
  decision: "approved" | "rejected";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClaimReviewInput>({
    resolver: zodResolver(claimReviewSchema),
    defaultValues: { claim_id: claimId, decision, amount_approved: decision === "approved" ? amountClaimed : undefined },
  });

  async function onSubmit(values: ClaimReviewInput) {
    setSubmitting(true);
    const result = await reviewClaim(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(decision === "approved" ? "Claim approved" : "Claim rejected");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={decision === "approved" ? "outline" : "ghost"} size="sm">
          {decision === "approved" ? <CheckCircle2 className="h-4 w-4 text-secondary" /> : <XCircle className="h-4 w-4 text-danger" />}
          {decision === "approved" ? "Approve" : "Reject"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {decision === "approved" ? "Approve" : "Reject"} Claim {claimNumber}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("claim_id")} />
          <input type="hidden" {...register("decision")} />
          {decision === "approved" && (
            <div>
              <Label className="mb-1.5 block">Amount Approved</Label>
              <Input type="number" step="0.01" {...register("amount_approved")} />
              {errors.amount_approved && <p className="mt-1 text-xs text-danger">{errors.amount_approved.message}</p>}
            </div>
          )}
          <div>
            <Label className="mb-1.5 block">Notes (optional)</Label>
            <Textarea {...register("review_notes")} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" variant={decision === "approved" ? "gradient" : "destructive"} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm {decision === "approved" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
