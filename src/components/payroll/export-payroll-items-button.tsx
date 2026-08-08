"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsv, downloadCsv } from "@/lib/csv";

interface PayrollItemExportRow {
  employee_number: string;
  employee_name: string;
  department_name: string;
  basic_salary: number;
  gross_salary: number;
  employee_nasscorp: number;
  income_tax: number;
  loan_deductions: number;
  total_deductions: number;
  net_salary: number;
}

const COLUMNS: { key: keyof PayrollItemExportRow; label: string }[] = [
  { key: "employee_number", label: "Employee Number" },
  { key: "employee_name", label: "Employee" },
  { key: "department_name", label: "Department" },
  { key: "basic_salary", label: "Basic Salary" },
  { key: "gross_salary", label: "Gross Salary" },
  { key: "employee_nasscorp", label: "NASSCORP (Employee)" },
  { key: "income_tax", label: "Income Tax (WHT)" },
  { key: "loan_deductions", label: "Loan Deductions" },
  { key: "total_deductions", label: "Total Deductions" },
  { key: "net_salary", label: "Net Salary" },
];

export function ExportPayrollItemsButton({ periodLabel, rows }: { periodLabel: string; rows: PayrollItemExportRow[] }) {
  function handleExport() {
    const csv = toCsv(rows, COLUMNS);
    downloadCsv(`payroll-${periodLabel.replace(/\s+/g, "-").toLowerCase()}.csv`, csv);
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
      <Download className="h-4 w-4" /> Export CSV
    </Button>
  );
}
