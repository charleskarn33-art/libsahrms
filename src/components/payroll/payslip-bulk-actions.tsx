"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendAllPayslips, retryFailedPayslips, markPaymentsProcessed } from "@/actions/payslips";

export function PayslipBulkActions({
  periodId,
  queuedCount,
  failedCount,
  canMarkProcessed,
}: {
  periodId: string;
  queuedCount: number;
  failedCount: number;
  canMarkProcessed: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<{ success: boolean; error?: string; data?: { sent: number; failed: number } }>) {
    setLoading(key);
    const result = await fn();
    setLoading(null);

    if (!result.success) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }
    if (result.data) {
      toast.success(`${result.data.sent} sent${result.data.failed ? `, ${result.data.failed} failed` : ""}`);
    } else {
      toast.success("Payroll marked as paid");
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {queuedCount > 0 && (
        <Button onClick={() => run("all", () => sendAllPayslips(periodId))} disabled={!!loading}>
          {loading === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send All ({queuedCount})
        </Button>
      )}
      {failedCount > 0 && (
        <Button variant="outline" onClick={() => run("retry", () => retryFailedPayslips(periodId))} disabled={!!loading}>
          {loading === "retry" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Retry Failed ({failedCount})
        </Button>
      )}
      {canMarkProcessed && (
        <Button variant="outline" onClick={() => run("processed", () => markPaymentsProcessed(periodId))} disabled={!!loading}>
          {loading === "processed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Mark Payments Processed
        </Button>
      )}
    </div>
  );
}
