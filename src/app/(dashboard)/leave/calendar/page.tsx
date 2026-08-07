import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function toMonthParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function LeaveCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthParam } = await searchParams;
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const today = new Date();
  const [year, month] = monthParam ? monthParam.split("-").map(Number) : [today.getFullYear(), today.getMonth() + 1];
  const monthDate = new Date(year, month - 1, 1);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const prevMonth = new Date(year, month - 2, 1);
  const nextMonth = new Date(year, month, 1);

  const [{ data: holidays }, { data: leaveRequests }] = await Promise.all([
    supabase
      .from("public_holidays")
      .select("name, holiday_date")
      .eq("company_id", companyId ?? "")
      .gte("holiday_date", monthStart.toISOString().slice(0, 10))
      .lte("holiday_date", monthEnd.toISOString().slice(0, 10)),
    supabase
      .from("leave_requests")
      .select("start_date, end_date, leave_type, employees(first_name, last_name)")
      .eq("company_id", companyId ?? "")
      .eq("status", "approved")
      .lte("start_date", monthEnd.toISOString().slice(0, 10))
      .gte("end_date", monthStart.toISOString().slice(0, 10)),
  ]);

  const holidaysByDay = new Map<number, string>();
  for (const h of holidays ?? []) {
    holidaysByDay.set(new Date(h.holiday_date).getDate(), h.name);
  }

  const leaveByDay = new Map<number, string[]>();
  for (const r of leaveRequests ?? []) {
    const emp = r.employees as unknown as { first_name: string; last_name: string } | null;
    const name = emp ? `${emp.first_name} ${emp.last_name}` : "Employee";
    const start = new Date(Math.max(new Date(r.start_date).getTime(), monthStart.getTime()));
    const end = new Date(Math.min(new Date(r.end_date).getTime(), monthEnd.getTime()));
    for (let d = start.getDate(); d <= end.getDate() && start.getMonth() === monthDate.getMonth(); d++) {
      const list = leaveByDay.get(d) ?? [];
      list.push(name);
      leaveByDay.set(d, list);
    }
  }

  const firstWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/leave">
          <ArrowLeft className="h-4 w-4" /> Back to Leave Dashboard
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Calendar</h1>
          <p className="text-sm text-muted-foreground">Approved leave and public holidays.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/leave/calendar?month=${toMonthParam(prevMonth)}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            {monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/leave/calendar?month=${toMonthParam(nextMonth)}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {cells.map((day, idx) => {
              const holidayName = day ? holidaysByDay.get(day) : undefined;
              const onLeave = day ? leaveByDay.get(day) ?? [] : [];
              const isToday = isCurrentMonth && day === today.getDate();
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[92px] rounded-xl border border-border p-2 text-left",
                    !day && "border-transparent",
                    holidayName && "bg-accent/5",
                    isToday && "ring-2 ring-primary"
                  )}
                >
                  {day && (
                    <>
                      <p className={cn("text-xs font-medium", isToday && "text-primary")}>{day}</p>
                      {holidayName && (
                        <Badge variant="accent" className="mt-1 flex w-fit items-center gap-1 text-[10px]">
                          <PartyPopper className="h-2.5 w-2.5" /> {holidayName}
                        </Badge>
                      )}
                      {onLeave.slice(0, 2).map((name) => (
                        <p key={name} className="mt-1 truncate text-[10px] text-muted-foreground">{name}</p>
                      ))}
                      {onLeave.length > 2 && (
                        <p className="mt-0.5 text-[10px] font-medium text-primary">+{onLeave.length - 2} more</p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
