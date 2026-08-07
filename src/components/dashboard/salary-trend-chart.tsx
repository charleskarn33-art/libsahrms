"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function SalaryTrendChart({ data }: { data: { month: string; total: number }[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Salary Cost Trend</CardTitle>
        <span className="text-xs text-muted-foreground">Last {data.length} periods</span>
      </CardHeader>
      <CardContent className="h-[280px] pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salaryFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0057FF" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#0057FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              axisLine={false}
              tickLine={false}
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v) => `$${Math.round(v / 1000)}K`}
              width={48}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }}
            />
            <Area type="monotone" dataKey="total" stroke="#0057FF" strokeWidth={2.5} fill="url(#salaryFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
