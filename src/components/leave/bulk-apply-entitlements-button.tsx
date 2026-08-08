"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bulkApplyEntitlements } from "@/actions/leave-settings";

export function BulkApplyEntitlementsButton({ year }: { year: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await bulkApplyEntitlements(year);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Applied default entitlements to ${result.data?.applied ?? 0} balance record(s) for ${year}`);
    router.refresh();
  }

  return (
    <Button variant="gradient" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
      Bulk Apply {year} Entitlements
    </Button>
  );
}
