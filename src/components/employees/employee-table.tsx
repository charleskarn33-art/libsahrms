"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Eye, Pencil, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import type { EmployeeDirectoryRow, EmploymentStatus } from "@/types/database";

const STATUS_VARIANT: Record<EmploymentStatus, "success" | "warning" | "danger" | "outline" | "default"> = {
  active: "success",
  on_leave: "warning",
  suspended: "warning",
  terminated: "danger",
  resigned: "outline",
  retired: "outline",
};

export function EmployeeTable({ employees }: { employees: EmployeeDirectoryRow[] }) {
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<EmployeeDirectoryRow>[]>(
    () => [
      {
        header: "Employee",
        accessorKey: "full_name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={row.original.photo_url ?? undefined} alt={row.original.full_name} />
              <AvatarFallback>{initials(row.original.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium leading-tight">{row.original.full_name}</p>
              <p className="text-xs text-muted-foreground">{row.original.employee_number}</p>
            </div>
          </div>
        ),
      },
      { header: "Department", accessorKey: "department_name", cell: ({ getValue }) => getValue<string>() ?? "—" },
      { header: "Position", accessorKey: "position_title", cell: ({ getValue }) => getValue<string>() ?? "—" },
      { header: "Email", accessorKey: "email", cell: ({ getValue }) => getValue<string>() ?? "—" },
      {
        header: "Status",
        accessorKey: "employment_status",
        cell: ({ getValue }) => {
          const status = getValue<EmploymentStatus>();
          return (
            <Badge variant={STATUS_VARIANT[status]} className="capitalize">
              {status.replace("_", " ")}
            </Badge>
          );
        },
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/employees/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/employees/${row.original.id}?edit=1`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: employees,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employees…"
          className="pl-10"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

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
                No employees found.
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)} ·{" "}
          {table.getFilteredRowModel().rows.length} employees
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
