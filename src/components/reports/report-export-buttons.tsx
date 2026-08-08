"use client";

import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsv, downloadCsv } from "@/lib/csv";

export function ReportExportButtons<T extends object>({
  filename,
  rows,
  columns,
  pdfHref,
}: {
  filename: string;
  rows: T[];
  columns: { key: keyof T; label: string }[];
  pdfHref?: string;
}) {
  function handleExportCsv() {
    const csv = toCsv(rows, columns);
    downloadCsv(`${filename}.csv`, csv);
  }

  return (
    <div className="flex items-center gap-2">
      {pdfHref && (
        <Button variant="outline" asChild disabled={rows.length === 0}>
          <Link href={pdfHref} target="_blank">
            <FileText className="h-4 w-4" /> PDF
          </Link>
        </Button>
      )}
      <Button variant="outline" onClick={handleExportCsv} disabled={rows.length === 0}>
        <Download className="h-4 w-4" /> Export CSV
      </Button>
    </div>
  );
}
