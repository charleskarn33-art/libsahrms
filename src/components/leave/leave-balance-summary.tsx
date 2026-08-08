import Link from "next/link";
import { CalendarDays, Baby, HeartHandshake, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ICONS: Record<string, typeof CalendarDays> = {
  annual: CalendarDays,
  sick: CalendarDays,
  maternity: Baby,
  paternity: Baby,
  compassionate: HeartHandshake,
  emergency: AlertCircle,
  unpaid: CalendarDays,
};

export interface LeaveBalanceRow {
  leave_type: string;
  entitled_days: number;
  used_days: number;
}

export function LeaveBalanceSummary({ balances }: { balances: LeaveBalanceRow[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Leave Balance Summary</CardTitle>
        <Link href="/leave/balance" className="text-xs font-medium text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="space-y-5">
        {balances.length === 0 && <p className="text-sm text-muted-foreground">No leave balances set up yet.</p>}
        {balances.map((b) => {
          const Icon = ICONS[b.leave_type] ?? CalendarDays;
          const remaining = b.entitled_days - b.used_days;
          const usedPct = b.entitled_days > 0 ? Math.min((b.used_days / b.entitled_days) * 100, 100) : 0;
          return (
            <div key={b.leave_type}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize leading-tight">{b.leave_type.replace("_", " ")} Leave</p>
                    <p className="text-xs text-muted-foreground">
                      Available {remaining}d · Taken {b.used_days}d
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="text-sm font-semibold">{remaining} Days</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${usedPct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
