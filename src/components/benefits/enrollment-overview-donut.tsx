"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#0057FF", "#00B894", "#6C5CE7", "#FF9800", "#00CEC9", "#E53935", "#FDCB6E"];

export function EnrollmentOverviewDonut({
  totalEnrolled,
  totalEmployees,
  plans,
}: {
  totalEnrolled: number;
  totalEmployees: number;
  plans: { name: string; enrolledCount: number }[];
}) {
  const data = plans.map((p, i) => ({ name: p.name, value: p.enrolledCount || 0.0001, color: COLORS[i % COLORS.length] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benefit Enrollment Overview</CardTitle>
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
            <p className="text-2xl font-bold">{totalEnrolled}</p>
            <p className="text-xs text-muted-foreground">Enrolled</p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {plans.length === 0 && <p className="text-sm text-muted-foreground">No plans yet.</p>}
          {plans.map((p, i) => (
            <div key={p.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 truncate">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate">{p.name}</span>
              </span>
              <span className="shrink-0 text-muted-foreground">
                {p.enrolledCount} ({totalEmployees > 0 ? Math.round((p.enrolledCount / totalEmployees) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
