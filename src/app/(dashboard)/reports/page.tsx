import Link from "next/link";
import { Wallet, Building2, Landmark, Banknote, Clock, CalendarDays, HandCoins, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

const REPORTS: { title: string; description: string; href: string; icon: LucideIcon }[] = [
  {
    title: "Payroll Summary",
    description: "Gross, net, deductions, and cost trend across every payroll period.",
    href: "/reports/payroll",
    icon: Wallet,
  },
  {
    title: "Department Cost",
    description: "Headcount and salary cost by department, current and per-period.",
    href: "/reports/departments",
    icon: Building2,
  },
  {
    title: "Tax & NASSCORP Remittance",
    description: "Statutory contribution and withholding tax due per employee, per period.",
    href: "/nasscorp",
    icon: Landmark,
  },
  {
    title: "Bank & Orange Money Transfers",
    description: "Net pay by employee, ready to hand to the bank or mobile money provider.",
    href: "/reports/payments",
    icon: Banknote,
  },
  {
    title: "Attendance",
    description: "Present, late, and absent counts with overtime hours for a date range.",
    href: "/reports/attendance",
    icon: Clock,
  },
  {
    title: "Leave",
    description: "Leave taken by type and department over a date range.",
    href: "/reports/leave",
    icon: CalendarDays,
  },
  {
    title: "Loans & Advances",
    description: "Outstanding balances, monthly deductions, and repayment status.",
    href: "/reports/loans",
    icon: HandCoins,
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Payroll, tax, attendance, and workforce analytics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="h-full transition-shadow hover:shadow-elevated">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-700">
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{r.title}</p>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
