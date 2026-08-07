import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, XCircle, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function pct(n: number, total: number) {
  return total > 0 ? `${((n / total) * 100).toFixed(2)}% of total` : "0% of total";
}

export function LeaveStatCards({
  total,
  approved,
  pending,
  rejected,
  todaysAbsences,
  monthOverMonthPct,
}: {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  todaysAbsences: number;
  monthOverMonthPct: number | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold leading-tight">{total}</p>
            <p className="text-xs text-muted-foreground">
              This Month
              {monthOverMonthPct !== null && (
                <span className={monthOverMonthPct >= 0 ? "ml-1 text-secondary" : "ml-1 text-danger"}>
                  {monthOverMonthPct >= 0 ? "↑" : "↓"} {Math.abs(monthOverMonthPct).toFixed(0)}% from last month
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold leading-tight">{approved}</p>
            <p className="text-xs text-muted-foreground">This Month · {pct(approved, total)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold leading-tight">{pending}</p>
            <p className="text-xs text-muted-foreground">This Month · {pct(pending, total)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold leading-tight">{rejected}</p>
            <p className="text-xs text-muted-foreground">This Month · {pct(rejected, total)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Today&apos;s Absences</p>
            <p className="text-2xl font-bold leading-tight">{todaysAbsences}</p>
            <Link href="/attendance" className="text-xs font-medium text-primary hover:underline">
              View details
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
