"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Eye, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendPayslipDelivery } from "@/actions/payslips";
import type { PayslipDeliveryStatus } from "@/types/database";

export function PayslipRowActions({
  payslipId,
  deliveryId,
  status,
}: {
  payslipId: string;
  deliveryId: string | null;
  status: PayslipDeliveryStatus | null;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!deliveryId) return;
    setSending(true);
    const result = await sendPayslipDelivery(deliveryId);
    setSending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Payslip emailed");
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" asChild title="View">
        <Link href={`/api/payslips/${payslipId}`} target="_blank">
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" asChild title="Download">
        <Link href={`/api/payslips/${payslipId}?download=1`}>
          <Download className="h-4 w-4" />
        </Link>
      </Button>
      {deliveryId && (status === "queued" || status === "failed") && (
        <Button variant="ghost" size="icon" onClick={handleSend} disabled={sending} title="Send email">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}
