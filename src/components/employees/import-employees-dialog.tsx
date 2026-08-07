"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, FileDown, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { parseCsv, downloadCsv } from "@/lib/csv";
import { bulkImportEmployees, type ImportRowResult } from "@/actions/employees";

const TEMPLATE_HEADERS = [
  "Employee Number",
  "First Name",
  "Middle Name",
  "Last Name",
  "Email",
  "Phone",
  "Department",
  "Position",
  "Date Hired",
  "Basic Salary",
];

function rowsFromCsv(text: string): Record<string, string>[] {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const headers = table[0].map((h) => h.trim());
  return table.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

export function ImportEmployeesDialog() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportRowResult[] | null>(null);

  function handleDownloadTemplate() {
    downloadCsv("employee-import-template.csv", TEMPLATE_HEADERS.join(","));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = rowsFromCsv(text);
    if (rows.length === 0) {
      toast.error("No data rows found in that file");
      return;
    }

    setImporting(true);
    const result = await bulkImportEmployees(rows);
    setImporting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setResults(result.data?.results ?? []);
    router.refresh();
  }

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) {
      setResults(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const created = results?.filter((r) => r.status === "created").length ?? 0;
  const skipped = results?.filter((r) => r.status === "skipped") ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" /> Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Employees</DialogTitle>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with a header row. Department and Position are matched by name against your existing
              records — unmatched names are left blank rather than failing the row.
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={handleDownloadTemplate} className="text-primary">
              <FileDown className="h-4 w-4" /> Download CSV template
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              disabled={importing}
              className="block w-full rounded-xl border border-dashed border-border p-4 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-primary"
            />
            {importing && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Importing…
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4">
              <div className="flex items-center gap-1.5 text-secondary">
                <CheckCircle2 className="h-4 w-4" /> <span className="text-sm font-medium">{created} created</span>
              </div>
              <div className="flex items-center gap-1.5 text-danger">
                <XCircle className="h-4 w-4" /> <span className="text-sm font-medium">{skipped.length} skipped</span>
              </div>
            </div>
            {skipped.length > 0 && (
              <div className="max-h-48 space-y-1 overflow-y-auto scrollbar-thin rounded-xl border border-border p-3">
                {skipped.map((r) => (
                  <p key={r.row} className="text-xs text-muted-foreground">
                    Row {r.row} ({r.employeeNumber}): {r.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
