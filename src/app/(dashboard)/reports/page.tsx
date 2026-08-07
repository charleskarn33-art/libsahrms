import { BarChart3 } from "lucide-react";
import { RoadmapPlaceholder } from "@/components/shared/roadmap-placeholder";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Payroll, tax, attendance, and workforce analytics.</p>
      </div>
      <RoadmapPlaceholder
        icon={BarChart3}
        title="Reporting Suite"
        description="The v_payroll_period_summary, v_department_headcount, and v_leave_balance_summary views already provide the aggregated data these reports need."
        phase="Phase 5"
        bullets={[
          "Payroll summary, department payroll, and salary cost reports",
          "Tax report and NASSCORP remittance report",
          "Attendance and leave reports",
          "Loan and bank / Orange Money transfer reports",
          "Monthly and yearly cost trends with Recharts",
          "Export to PDF, Excel, and CSV",
        ]}
      />
    </div>
  );
}
