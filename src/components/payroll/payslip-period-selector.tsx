"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PayslipPeriodSelector({ periods, currentId }: { periods: { id: string; period_label: string }[]; currentId: string }) {
  const router = useRouter();

  return (
    <Select value={currentId} onValueChange={(id) => router.push(`/payroll/payslips?period=${id}`)}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {periods.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.period_label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
