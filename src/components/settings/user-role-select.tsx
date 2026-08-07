"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserRole } from "@/actions/users";
import { ROLE_LABELS } from "@/components/layout/nav-config";
import type { UserRole } from "@/types/database";

const ROLES = Object.keys(ROLE_LABELS) as UserRole[];

export function UserRoleSelect({ profileId, role }: { profileId: string; role: UserRole }) {
  const router = useRouter();
  const [value, setValue] = useState(role);

  async function handleChange(next: string) {
    setValue(next as UserRole);
    const result = await updateUserRole(profileId, next);
    if (!result.success) {
      toast.error(result.error);
      setValue(role);
      return;
    }
    toast.success("Role updated");
    router.refresh();
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
