import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function NasscorpSummary({
  employeeNasscorp,
  employerNasscorp,
  taxableGross,
  totalWht,
}: {
  employeeNasscorp: number;
  employerNasscorp: number;
  taxableGross: number;
  totalWht: number;
}) {
  const totalNasscorp = employeeNasscorp + employerNasscorp;

  return (
    <Card>
      <CardHeader>
        <CardTitle>NASSCORP &amp; Tax Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">NASSCORP Contribution</p>
          <Row label="Employee (4%)" value={formatCurrency(employeeNasscorp)} />
          <Row label="Employer (6%)" value={formatCurrency(employerNasscorp)} />
          <div className="mt-2 flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary-700">
            <span>Total NASSCORP</span>
            <span>{formatCurrency(totalNasscorp)}</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Tax Withholding (WHT)</p>
          <Row label="Total Taxable Pay" value={formatCurrency(taxableGross)} />
          <Row label="Total WHT" value={formatCurrency(totalWht)} />
        </div>

        <Link href="/reports" className="inline-block text-sm font-medium text-primary hover:underline">
          View Full Report →
        </Link>
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
