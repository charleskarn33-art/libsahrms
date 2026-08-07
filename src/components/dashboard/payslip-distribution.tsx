"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const COLORS = { sent: "#00B894", pending: "#0057FF", failed: "#FF9800" };

export function PayslipDistribution({
  total,
  sent,
  pending,
  failed,
}: {
  total: number;
  sent: number;
  pending: number;
  failed: number;
}) {
  const data = [
    { name: "Sent", value: sent || 0.0001, color: COLORS.sent },
    { name: "Pending", value: pending || 0.0001, color: COLORS.pending },
    { name: "Failed", value: failed || 0.0001, color: COLORS.failed },
  ];

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payslip Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto h-[180px] w-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={62} outerRadius={82} paddingAngle={3} strokeWidth={0}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {[
            { label: "Sent", value: sent, color: COLORS.sent },
            { label: "Pending", value: pending, color: COLORS.pending },
            { label: "Failed", value: failed, color: COLORS.failed },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                {row.label}
              </span>
              <span className="text-muted-foreground">
                {row.value} ({pct(row.value)}%)
              </span>
            </div>
          ))}
        </div>

        <Link href="/reports" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">
          View Distribution Report →
        </Link>
      </CardContent>
    </Card>
  );
}
