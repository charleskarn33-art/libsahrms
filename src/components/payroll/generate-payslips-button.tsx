"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generatePayslips } from "@/actions/payslips";

export function GeneratePayslipsButton({ periodId }: { periodId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await generatePayslips(periodId);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.data?.generated ?? 0} payslip(s) generated${result.data?.skipped ? `, ${result.data.skipped} skipped` : ""}`);
    router.refresh();
  }

  return (
    <Button variant="gradient" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      Generate Payslips
    </Button>
  );
}
