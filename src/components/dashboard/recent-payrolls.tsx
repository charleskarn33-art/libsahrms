import Link from "next/link";
import { Eye, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { PayrollPeriodSummary } from "@/types/database";

const STATUS_VARIANT: Record<string, "success" | "warning" | "default" | "danger" | "outline"> = {
  paid: "success",
  approved: "success",
  locked: "default",
  pending: "warning",
  draft: "outline",
  cancelled: "danger",
};

export function RecentPayrolls({ periods }: { periods: PayrollPeriodSummary[] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Recent Payrolls</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payroll Period</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Payroll</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No payroll periods yet.
                </TableCell>
              </TableRow>
            )}
            {periods.map((p) => (
              <TableRow key={p.payroll_period_id}>
                <TableCell className="font-medium">{p.period_label}</TableCell>
                <TableCell>{p.employee_count}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "outline"} className="capitalize">
                    {p.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(p.total_net)}</TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {p.approval_stage.replace(/_/g, " ")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/payroll/periods/${p.payroll_period_id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-6">
          <Link href="/payroll/periods" className="text-sm font-medium text-primary hover:underline">
            View All Payrolls →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
