"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import type { PayrollStatus } from "@/types/database";

export interface PayrollPeriodRow {
  id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  status: PayrollStatus;
  employee_count: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  created_by_name: string | null;
  created_by_role: string | null;
  created_by_avatar: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<PayrollStatus, string> = {
  draft: "Draft",
  pending: "Pending Approval",
  approved: "Approved",
  locked: "Locked",
  paid: "Paid",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<PayrollStatus, "success" | "warning" | "default" | "danger" | "outline"> = {
  paid: "success",
  approved: "success",
  locked: "default",
  pending: "warning",
  draft: "outline",
  cancelled: "danger",
};

export function PayrollPeriodsTable({ periods, pageSize = 7 }: { periods: PayrollPeriodRow[]; pageSize?: number }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [size, setSize] = useState(pageSize);

  const pageCount = Math.max(Math.ceil(periods.length / size), 1);
  const page = useMemo(() => periods.slice(pageIndex * size, pageIndex * size + size), [periods, pageIndex, size]);
  const rangeStart = periods.length === 0 ? 0 : pageIndex * size + 1;
  const rangeEnd = Math.min(rangeStart + size - 1, periods.length);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead>Gross Pay</TableHead>
            <TableHead>Deductions</TableHead>
            <TableHead>Net Pay</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {page.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                No payroll periods yet.
              </TableCell>
            </TableRow>
          )}
          {page.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <p className="font-medium leading-tight">{p.period_label}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(p.period_start)} – {formatDate(p.period_end)}
                </p>
              </TableCell>
              <TableCell>{p.employee_count}</TableCell>
              <TableCell>{formatCurrency(p.total_gross)}</TableCell>
              <TableCell>{formatCurrency(p.total_deductions)}</TableCell>
              <TableCell className="font-medium">{formatCurrency(p.total_net)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
              </TableCell>
              <TableCell>
                {p.created_by_name ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {p.created_by_avatar ? (
                        <AvatarImage src={p.created_by_avatar} alt={p.created_by_name} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">{initials(p.created_by_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium leading-tight">{p.created_by_name}</p>
                      <p className="text-[11px] capitalize text-muted-foreground">{p.created_by_role?.replace("_", " ")}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/payroll/periods/${p.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {rangeStart} to {rangeEnd} of {periods.length} payroll periods
        </p>
        <div className="flex items-center gap-3">
          <Select value={String(size)} onValueChange={(v) => { setSize(Number(v)); setPageIndex(0); }}>
            <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[7, 10, 25, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setPageIndex((p) => Math.max(p - 1, 0))} disabled={pageIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: pageCount }, (_, i) => i).map((i) => (
              <Button key={i} variant={i === pageIndex ? "default" : "outline"} size="icon" onClick={() => setPageIndex(i)}>
                {i + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPageIndex((p) => Math.min(p + 1, pageCount - 1))}
              disabled={pageIndex >= pageCount - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
