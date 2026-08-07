"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewLeaveRequest } from "@/actions/leave";

export function LeaveReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approved" | "rejected" | null>(null);

  async function review(decision: "approved" | "rejected") {
    setPending(decision);
    const result = await reviewLeaveRequest(id, decision);
    setPending(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Leave request ${decision}`);
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" className="text-secondary" onClick={() => review("approved")} disabled={!!pending}>
        {pending === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" className="text-danger" onClick={() => review("rejected")} disabled={!!pending}>
        {pending === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </Button>
    </div>
  );
}
