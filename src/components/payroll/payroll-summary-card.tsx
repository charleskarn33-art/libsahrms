import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export function PayrollSummaryCard({
  periodLabel,
  totalEmployees,
  totalGross,
  totalWht,
  totalNasscorp,
  totalLoans,
  otherDeductions,
  netPay,
}: {
  periodLabel: string;
  totalEmployees: number;
  totalGross: number;
  totalWht: number;
  totalNasscorp: number;
  totalLoans: number;
  otherDeductions: number;
  netPay: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Payroll Summary <span className="text-sm font-normal text-muted-foreground">({periodLabel})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <Row label="Total Employees" value={String(totalEmployees)} />
        <Row label="Total Gross Pay" value={formatCurrency(totalGross)} />
        <Row label="Total Tax (WHT)" value={formatCurrency(totalWht)} />
        <Row label="Total NASSCORP Employee (4%)" value={formatCurrency(totalNasscorp)} />
        <Row label="Total Loans & Advances" value={formatCurrency(totalLoans)} />
        <Row label="Other Deductions" value={formatCurrency(otherDeductions)} />
        <div className="my-2 h-px bg-border" />
        <div className="flex items-center justify-between py-1.5">
          <span className="font-medium">Net Pay</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(netPay)}</span>
        </div>
        <Button asChild variant="gradient" className="mt-3 w-full">
          <Link href="/reports">View Payroll Summary Report</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
