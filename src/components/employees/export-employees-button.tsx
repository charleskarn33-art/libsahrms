"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsv, downloadCsv } from "@/lib/csv";
import type { EmployeeDirectoryRow } from "@/types/database";

const COLUMNS: { key: keyof EmployeeDirectoryRow; label: string }[] = [
  { key: "employee_number", label: "Employee Number" },
  { key: "first_name", label: "First Name" },
  { key: "middle_name", label: "Middle Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "department_name", label: "Department" },
  { key: "position_title", label: "Position" },
  { key: "employment_status", label: "Employment Status" },
  { key: "employment_type", label: "Employment Type" },
  { key: "date_hired", label: "Date Hired" },
  { key: "tin", label: "TIN" },
];

export function ExportEmployeesButton({ employees }: { employees: EmployeeDirectoryRow[] }) {
  function handleExport() {
    const csv = toCsv(employees, COLUMNS);
    downloadCsv(`employees-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="h-4 w-4" /> Export
    </Button>
  );
}
