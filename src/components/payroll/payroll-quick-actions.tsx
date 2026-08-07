import Link from "next/link";
import { ChevronRight, PlayCircle, Eye, FileText, Send, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACTIONS = [
  { label: "Run Payroll", description: "Process payroll for this period", href: "/payroll/periods", icon: PlayCircle },
  { label: "View Payroll Preview", description: "Preview payroll before approval", href: "/payroll/periods", icon: Eye },
  { label: "Generate Payslips", description: "Generate payslips for employees", href: "/payroll/payslips", icon: FileText },
  { label: "Send Payslips", description: "Email payslips to employees", href: "/payroll/payslips", icon: Send },
  { label: "Payroll Settings", description: "Configure payroll preferences", href: "/payroll/settings", icon: Settings },
];

export function PayrollQuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <action.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{action.label}</p>
              <p className="truncate text-xs text-muted-foreground">{action.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
