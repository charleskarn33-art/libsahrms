"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, MoreHorizontal, RotateCcw, Search, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeaveReviewActions } from "@/components/leave/leave-review-actions";
import { initials, formatDate } from "@/lib/utils";
import { tagColor } from "@/lib/tag-colors";
import type { LeaveRequestStatus, LeaveType } from "@/types/database";

export interface LeaveRequestRow {
  id: string;
  employee_name: string;
  employee_number: string;
  department_name: string | null;
  photo_url: string | null;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string | null;
  status: LeaveRequestStatus;
  applied_at: string;
}

const STATUS_VARIANT: Record<LeaveRequestStatus, "success" | "warning" | "danger" | "outline"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
  cancelled: "outline",
};

const STATUS_ICON: Record<LeaveRequestStatus, typeof Clock> = {
  approved: CheckCircle2,
  pending: Clock,
  rejected: XCircle,
  cancelled: XCircle,
};

const ALL = "__all__";
const TABS: { key: LeaveRequestStatus | "all"; label: string }[] = [
  { key: "all", label: "All Requests" },
  { key: "pending", label: "Pending Approval" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
];

export function LeaveTable({ requests, isHr }: { requests: LeaveRequestRow[]; isHr: boolean }) {
  const [tab, setTab] = useState<LeaveRequestStatus | "all">("all");
  const [globalFilter, setGlobalFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);

  const departmentOptions = useMemo(
    () => Array.from(new Set(requests.map((r) => r.department_name).filter((v): v is string => !!v))).sort(),
    [requests]
  );

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: requests.length };
    for (const r of requests) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return counts;
  }, [requests]);

  const filtered = useMemo(
    () =>
      requests.filter(
        (r) =>
          (tab === "all" || r.status === tab) &&
          (departmentFilter === ALL || r.department_name === departmentFilter) &&
          (typeFilter === ALL || r.leave_type === typeFilter)
      ),
    [requests, tab, departmentFilter, typeFilter]
  );

  const columns = useMemo<ColumnDef<LeaveRequestRow>[]>(
    () => [
      {
        header: "Employee",
        accessorKey: "employee_name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={row.original.photo_url ?? undefined} alt={row.original.employee_name} />
              <AvatarFallback>{initials(row.original.employee_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium leading-tight">{row.original.employee_name}</p>
              <p className="text-xs text-muted-foreground">
                {row.original.employee_number}
                {row.original.department_name ? ` · ${row.original.department_name}` : ""}
              </p>
            </div>
          </div>
        ),
      },
      {
        header: "Leave Type",
        accessorKey: "leave_type",
        cell: ({ getValue }) => {
          const type = getValue<string>();
          return <Badge className={`capitalize ${tagColor(type)}`}>{type.replace("_", " ")} Leave</Badge>;
        },
      },
      {
        header: "Period",
        accessorKey: "start_date",
        cell: ({ row }) => (
          <span className="text-sm">
            {formatDate(row.original.start_date)} – {formatDate(row.original.end_date)}
          </span>
        ),
      },
      {
        header: "Duration",
        accessorKey: "days_requested",
        cell: ({ getValue }) => `${getValue<number>()} Day${getValue<number>() === 1 ? "" : "s"}`,
      },
      {
        header: "Reason",
        accessorKey: "reason",
        cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue<string>() || "—"}</span>,
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ getValue }) => {
          const status = getValue<LeaveRequestStatus>();
          const Icon = STATUS_ICON[status];
          return (
            <Badge variant={STATUS_VARIANT[status]} className="gap-1 capitalize">
              <Icon className="h-3 w-3" /> {status}
            </Badge>
          );
        },
      },
      {
        header: "Applied On",
        accessorKey: "applied_at",
        cell: ({ getValue }) =>
          formatDate(getValue<string>(), { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) =>
          isHr && row.original.status === "pending" ? (
            <div className="flex justify-end">
              <LeaveReviewActions id={row.original.id} />
            </div>
          ) : (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>No further actions</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
      },
    ],
    [isHr]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 7 } },
  });

  const pageCount = Math.max(table.getPageCount(), 1);
  const pageIndex = table.getState().pagination.pageIndex;
  const totalRows = table.getFilteredRowModel().rows.length;
  const rangeStart = totalRows === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1;
  const rangeEnd = Math.min(rangeStart + table.getState().pagination.pageSize - 1, totalRows);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leave requests…"
            className="pl-10"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>

        {isHr && (
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Departments</SelectItem>
              {departmentOptions.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Leave Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Leave Types</SelectItem>
            {(["annual", "sick", "compassionate", "maternity", "paternity", "emergency", "unpaid"] as LeaveType[]).map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(departmentFilter !== ALL || typeFilter !== ALL || globalFilter) && (
          <Button
            variant="ghost"
            size="icon"
            title="Reset filters"
            onClick={() => {
              setDepartmentFilter(ALL);
              setTypeFilter(ALL);
              setGlobalFilter("");
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as LeaveRequestStatus | "all")}>
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label} <span className="ml-1.5 text-xs text-muted-foreground">{tabCounts[t.key] ?? 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-12 text-center text-sm text-muted-foreground">
                No leave requests found.
              </TableCell>
            </TableRow>
          )}
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {rangeStart} to {rangeEnd} of {totalRows} requests
        </p>
        <div className="flex items-center gap-3">
          <Select value={String(table.getState().pagination.pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
            <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[7, 10, 25, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: pageCount }, (_, i) => i)
              .filter((i) => i === 0 || i === pageCount - 1 || Math.abs(i - pageIndex) <= 1)
              .reduce<number[]>((acc, i) => {
                if (acc.length && i - acc[acc.length - 1] > 1) acc.push(-1);
                acc.push(i);
                return acc;
              }, [])
              .map((i, idx) =>
                i === -1 ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-sm text-muted-foreground">…</span>
                ) : (
                  <Button key={i} variant={i === pageIndex ? "default" : "outline"} size="icon" onClick={() => table.setPageIndex(i)}>
                    {i + 1}
                  </Button>
                )
              )}
            <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
