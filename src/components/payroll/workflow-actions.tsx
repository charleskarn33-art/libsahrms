"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, PlayCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generatePayroll, financeReview, directorApproval, lockPayroll, unlockPayroll } from "@/actions/payroll";
import type { PayrollApprovalStage, UserRole } from "@/types/database";

export function WorkflowActions({
  periodId,
  stage,
  role,
}: {
  periodId: string;
  stage: PayrollApprovalStage;
  role: UserRole;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run(fn: () => Promise<{ success: boolean; error?: string }>, successMsg: string) {
    setLoading(true);
    const result = await fn();
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }
    toast.success(successMsg);
    router.refresh();
  }

  const canPrepare = ["super_admin", "hr_manager", "payroll_officer"].includes(role);
  const canReviewFinance = ["super_admin", "finance_manager"].includes(role);
  const canApproveDirector = ["super_admin", "managing_director"].includes(role);
  const canLock = ["super_admin", "payroll_officer", "hr_manager"].includes(role);
  const canUnlock = role === "super_admin";

  if (stage === "hr_preparation" && canPrepare) {
    return (
      <Button size="sm" onClick={() => run(() => generatePayroll(periodId), "Payroll generated and sent for finance review")} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
        Generate Payroll
      </Button>
    );
  }

  if (stage === "finance_review" && canReviewFinance) {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => run(() => financeReview(periodId, "approved"), "Approved — sent to director")} disabled={loading}>
          <Check className="h-4 w-4" /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => run(() => financeReview(periodId, "rejected"), "Sent back to HR")} disabled={loading}>
          <X className="h-4 w-4" /> Reject
        </Button>
      </div>
    );
  }

  if (stage === "director_approval" && canApproveDirector) {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => run(() => directorApproval(periodId, "approved"), "Payroll approved")} disabled={loading}>
          <Check className="h-4 w-4" /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => run(() => directorApproval(periodId, "rejected"), "Sent back to finance")} disabled={loading}>
          <X className="h-4 w-4" /> Reject
        </Button>
      </div>
    );
  }

  if (stage === "payroll_locked" && canLock) {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => run(() => lockPayroll(periodId), "Payroll locked")} disabled={loading}>
          <Lock className="h-4 w-4" /> Lock Payroll
        </Button>
        {canUnlock && (
          <Button size="sm" variant="outline" onClick={() => run(() => unlockPayroll(periodId), "Payroll unlocked")} disabled={loading}>
            Unlock
          </Button>
        )}
      </div>
    );
  }

  return <span className="text-xs text-muted-foreground">Awaiting next stage</span>;
}
