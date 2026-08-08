"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteHoliday } from "@/actions/holidays";

export function DeleteHolidayButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await deleteHoliday(id);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Holiday removed");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" className="text-danger" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
