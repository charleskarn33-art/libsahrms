import Link from "next/link";
import { UserPlus, DollarSign, FileSpreadsheet, FileText, Send, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ACTIONS = [
  { label: "Add Employee", href: "/employees/new", icon: UserPlus, tone: "text-primary bg-primary/10" },
  { label: "Create Payroll", href: "/payroll/periods", icon: DollarSign, tone: "text-white bg-primary" },
  { label: "Import Employees", href: "/employees?import=1", icon: FileSpreadsheet, tone: "text-secondary bg-secondary/10" },
  { label: "Generate Payslips", href: "/payroll/payslips", icon: FileText, tone: "text-accent bg-accent/10" },
  { label: "Bulk Email Payslips", href: "/payroll/payslips", icon: Send, tone: "text-warning bg-warning/10" },
  { label: "Reports", href: "/reports", icon: BarChart3, tone: "text-danger bg-danger/10" },
];

export function QuickActions() {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-10 gap-y-4 p-5">
        <p className="text-sm font-semibold text-muted-foreground">Quick Actions</p>
        <div className="flex flex-1 flex-wrap gap-6">
          {ACTIONS.map((action) => (
            <Link key={action.label} href={action.href} className="group flex items-center gap-2.5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${action.tone}`}>
                <action.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
