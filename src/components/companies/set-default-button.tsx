"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setDefaultCompany } from "@/actions/companies";

export function SetDefaultButton({
  companyId,
  profileId,
  isDefault,
}: {
  companyId: string;
  profileId: string;
  isDefault: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (isDefault) return;
    setLoading(true);
    const result = await setDefaultCompany(profileId, companyId);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Default company updated");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={loading || isDefault}
      title={isDefault ? "This is their default company" : "Set as their default company"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Star className={cn("h-4 w-4", isDefault ? "fill-warning text-warning" : "text-muted-foreground")} />
      )}
    </Button>
  );
}
