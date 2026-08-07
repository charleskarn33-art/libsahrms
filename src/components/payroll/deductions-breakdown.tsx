"use client";

import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const COLORS = {
  wht: "#0057FF",
  nasscorp: "#00B894",
  loans: "#FF9800",
  other: "#6C5CE7",
};

export function DeductionsBreakdown({
  periodLabel,
  wht,
  nasscorp,
  loans,
  other,
}: {
  periodLabel: string;
  wht: number;
  nasscorp: number;
  loans: number;
  other: number;
}) {
  const total = wht + nasscorp + loans + other;
  const rows = [
    { label: "WHT (Tax)", value: wht, color: COLORS.wht },
    { label: "NASSCORP Employee (4%)", value: nasscorp, color: COLORS.nasscorp },
    { label: "Loans & Advances", value: loans, color: COLORS.loans },
    { label: "Other Deductions", value: other, color: COLORS.other },
  ];
  const data = rows.map((r) => ({ ...r, value: r.value || 0.0001 }));
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0.0");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Deductions Breakdown <span className="text-sm font-normal text-muted-foreground">({periodLabel})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-[180px] w-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={62} outerRadius={82} paddingAngle={3} strokeWidth={0}>
                  {data.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-lg font-bold">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground">Total Deductions</p>
            </div>
          </div>

          <div className="flex-1 space-y-2.5">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                  {r.label}
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency(r.value)} ({pct(r.value)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <Link href="/reports" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">
          View Full Deductions Report →
        </Link>
      </CardContent>
    </Card>
  );
}
