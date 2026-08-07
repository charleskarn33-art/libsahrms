import { Check, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import type { PayrollApprovalStage } from "@/types/database";

const STAGES: { key: PayrollApprovalStage; label: string }[] = [
  { key: "hr_preparation", label: "HR Preparation" },
  { key: "finance_review", label: "Finance Review" },
  { key: "director_approval", label: "Director Approval" },
  { key: "payroll_locked", label: "Payroll Locked" },
  { key: "payslips_sent", label: "Payslips Generated" },
  { key: "payments_processed", label: "Payments Processed" },
];

export function PayrollWorkflow({
  currentStage,
  periodLabel,
  hrPreparedAt,
  showHistoryLink = false,
  detailsHref = "/payroll/periods",
}: {
  currentStage: PayrollApprovalStage | null;
  periodLabel: string | null;
  hrPreparedAt?: string | null;
  showHistoryLink?: boolean;
  detailsHref?: string;
}) {
  const currentIndex = currentStage ? STAGES.findIndex((s) => s.key === currentStage) : -1;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Payroll Approval Workflow</CardTitle>
        {showHistoryLink && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/audit-logs">
              <History className="h-4 w-4" /> View Approval History
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!periodLabel ? (
          <p className="text-sm text-muted-foreground">No payroll period in progress.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              {STAGES.map((stage, idx) => {
                const done = idx < currentIndex;
                const active = idx === currentIndex;
                return (
                  <div key={stage.key} className="flex flex-1 flex-col items-center text-center">
                    <div className="flex w-full items-center">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                          done && "bg-secondary text-white",
                          active && "bg-primary text-white",
                          !done && !active && "bg-muted text-muted-foreground"
                        )}
                      >
                        {done ? <Check className="h-4 w-4" /> : idx + 1}
                      </div>
                      {idx < STAGES.length - 1 && (
                        <div className={cn("mx-1 h-0.5 flex-1", idx < currentIndex ? "bg-secondary" : "bg-border")} />
                      )}
                    </div>
                    <p className="mt-2 text-xs font-medium">{stage.label}</p>
                    <p className={cn("text-[11px]", done ? "text-secondary" : active ? "text-primary" : "text-muted-foreground")}>
                      {done ? "Completed" : active ? "In Progress" : "Pending"}
                    </p>
                    {idx === 0 && done && hrPreparedAt && (
                      <p className="text-[10px] text-muted-foreground">{formatDate(hrPreparedAt)}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-primary/5 p-4">
              <p className="text-sm text-primary-700">
                {currentIndex >= 0 && currentIndex < STAGES.length
                  ? `${periodLabel} is at the "${STAGES[currentIndex].label}" stage.`
                  : `${periodLabel} status unknown.`}
              </p>
              <Button size="sm" asChild>
                <Link href={detailsHref}>View Payroll Details</Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
