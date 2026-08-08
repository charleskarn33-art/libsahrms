"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function NasscorpTrendChart({ data }: { data: { period: string; employee: number; employer: number; total: number }[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>NASSCORP Trend</CardTitle>
        <span className="text-xs text-muted-foreground">Last {data.length} periods</span>
      </CardHeader>
      <CardContent className="h-[260px] pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="period" axisLine={false} tickLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              axisLine={false}
              tickLine={false}
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v) => `${Math.round(v / 1000)}K`}
              width={48}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="employee" name="Employee (4%)" stroke="#0057FF" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="employer" name="Employer (6%)" stroke="#00B894" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="total" name="Total (10%)" stroke="#6C5CE7" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
