"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Eye, Loader2, MoreHorizontal, Pencil, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { tagColor } from "@/lib/tag-colors";
import { deleteEmployees } from "@/actions/employees";
import type { EmployeeDirectoryRow, EmploymentStatus, EmploymentType } from "@/types/database";

const STATUS_VARIANT: Record<EmploymentStatus, "success" | "warning" | "danger" | "outline"> = {
  active: "success",
  probation: "warning",
  on_leave: "warning",
  suspended: "warning",
  terminated: "danger",
  resigned: "outline",
  retired: "outline",
};

const ALL = "__all__";

export function EmployeeTable({ employees }: { employees: EmployeeDirectoryRow[] }) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleting, setDeleting] = useState(false);

  const departmentOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department_name).filter((v): v is string => !!v))).sort(),
    [employees]
  );

  const filtered = useMemo(
    () =>
      employees.filter(
        (e) =>
          (departmentFilter === ALL || e.department_name === departmentFilter) &&
          (statusFilter === ALL || e.employment_status === statusFilter) &&
          (typeFilter === ALL || e.employment_type === typeFilter)
      ),
    [employees, departmentFilter, statusFilter, typeFilter]
  );

  const columns = useMemo<ColumnDef<EmployeeDirectoryRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
      },
      {
        header: "Employee ID",
        accessorKey: "employee_number",
        cell: ({ row }) => (
          <Link href={`/employees/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.employee_number}
          </Link>
        ),
      },
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
              {row.original.tin && <p className="text-xs text-muted-foreground">TIN: {row.original.tin}</p>}
            </div>
          </div>
        ),
      },
      {
        header: "Department",
        accessorKey: "department_name",
        cell: ({ getValue }) => {
          const name = getValue<string | null>();
          return name ? <Badge className={tagColor(name)}>{name}</Badge> : <span className="text-muted-foreground">—</span>;
        },
      },
      { header: "Position", accessorKey: "position_title", cell: ({ getValue }) => getValue<string>() ?? "—" },
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
      { header: "Email", accessorKey: "email", cell: ({ getValue }) => getValue<string>() ?? "—" },
      { header: "Phone", accessorKey: "phone", cell: ({ getValue }) => getValue<string>() ?? "—" },
      { header: "Date Hired", accessorKey: "date_hired" },
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-danger focus:bg-danger/10"
                  onClick={async () => {
                    setDeleting(true);
                    const result = await deleteEmployees([row.original.id]);
                    setDeleting(false);
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Employee deleted");
                    router.refresh();
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [router]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const selectedIds = table.getSelectedRowModel().rows.map((r) => r.original.id);
  const pageCount = Math.max(table.getPageCount(), 1);
  const pageIndex = table.getState().pagination.pageIndex;
  const totalRows = table.getFilteredRowModel().rows.length;
  const rangeStart = totalRows === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1;
  const rangeEnd = Math.min(rangeStart + table.getState().pagination.pageSize - 1, totalRows);

  async function handleBulkDelete() {
    setDeleting(true);
    const result = await deleteEmployees(selectedIds);
    setDeleting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${selectedIds.length} employee(s) deleted`);
    setRowSelection({});
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees…"
            className="pl-10"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Departments</SelectItem>
            {departmentOptions.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Status</SelectItem>
            {(Object.keys(STATUS_VARIANT) as EmploymentStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Types</SelectItem>
            {(["full_time", "part_time", "contract", "intern", "temporary"] as EmploymentType[]).map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(departmentFilter !== ALL || statusFilter !== ALL || typeFilter !== ALL || globalFilter) && (
          <Button
            variant="ghost"
            size="icon"
            title="Reset filters"
            onClick={() => {
              setDepartmentFilter(ALL);
              setStatusFilter(ALL);
              setTypeFilter(ALL);
              setGlobalFilter("");
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-2.5">
          <p className="text-sm font-medium text-primary-700">{selectedIds.length} selected</p>
          <Button variant="outline" size="sm" onClick={handleBulkDelete} disabled={deleting} className="text-danger">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete Selected
          </Button>
        </div>
      )}

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
            <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {rangeStart} to {rangeEnd} of {totalRows} employees
        </p>
        <div className="flex items-center gap-3">
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((size) => (
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
                  <Button
                    key={i}
                    variant={i === pageIndex ? "default" : "outline"}
                    size="icon"
                    onClick={() => table.setPageIndex(i)}
                  >
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
