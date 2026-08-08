"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ReportPeriodSelector({
  basePath,
  periods,
  currentId,
  placeholder = "Select period",
}: {
  basePath: string;
  periods: { id: string; period_label: string }[];
  currentId?: string;
  placeholder?: string;
}) {
  const router = useRouter();

  return (
    <Select value={currentId} onValueChange={(id) => router.push(`${basePath}?period=${id}`)}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder={placeholder} />
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
