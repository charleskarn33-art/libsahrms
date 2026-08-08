"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ClaimsTrendChart({ data }: { data: { month: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claims Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-[220px] pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="claimsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0057FF" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#0057FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" width={32} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
            <Area type="monotone" dataKey="count" stroke="#0057FF" strokeWidth={2.5} fill="url(#claimsFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
