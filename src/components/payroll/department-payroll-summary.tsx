import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export interface DepartmentPayrollRow {
  department_name: string;
  employee_count: number;
  gross: number;
  deductions: number;
  net: number;
  percent: number;
}

export function DepartmentPayrollSummary({ periodLabel, rows }: { periodLabel: string; rows: DepartmentPayrollRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Department Payroll Summary <span className="text-sm font-normal text-muted-foreground">({periodLabel})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Gross Pay</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Net Pay</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No payroll generated for this period yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.department_name}>
                <TableCell className="font-medium">{r.department_name}</TableCell>
                <TableCell>{r.employee_count || "—"}</TableCell>
                <TableCell>{r.gross ? formatCurrency(r.gross) : "—"}</TableCell>
                <TableCell>{r.deductions ? formatCurrency(r.deductions) : "—"}</TableCell>
                <TableCell>{r.net ? formatCurrency(r.net) : "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(r.percent, 100)}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">{r.percent.toFixed(2)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
