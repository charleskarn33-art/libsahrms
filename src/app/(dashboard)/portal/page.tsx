import Link from "next/link";
import { Clock, CalendarDays, FileText, HandCoins, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, initials } from "@/lib/utils";

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: employee } = await supabase.from("employees").select("*, departments!department_id(name), positions(title)").eq("profile_id", user?.id ?? "").maybeSingle();

  const { data: payslips } = employee
    ? await supabase
        .from("payslips")
        .select("id, payslip_number, generated_at, payroll_periods(period_label)")
        .eq("employee_id", employee.id)
        .order("generated_at", { ascending: false })
        .limit(5)
    : { data: [] };

  if (!employee) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Your account is not yet linked to an employee record. Contact HR to complete your profile setup.
        </CardContent>
      </Card>
    );
  }

  const fullName = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(" ");
  const gross =
    employee.basic_salary + employee.transport_allowance + employee.housing_allowance + employee.relocation_allowance;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <Avatar className="h-16 w-16 text-lg">
            <AvatarImage src={employee.photo_url ?? undefined} alt={fullName} />
            <AvatarFallback>{initials(fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{fullName}</h1>
            <p className="text-sm text-muted-foreground">
              {employee.employee_number} · {(employee.positions as unknown as { title: string } | null)?.title ?? "—"} ·{" "}
              {(employee.departments as unknown as { name: string } | null)?.name ?? "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Gross Monthly Pay</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(gross)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Attendance", href: "/attendance", icon: Clock, tone: "bg-primary/10 text-primary" },
          { label: "Request Leave", href: "/leave", icon: CalendarDays, tone: "bg-secondary/10 text-secondary" },
          { label: "Loans & Advances", href: "/loans", icon: HandCoins, tone: "bg-accent/10 text-accent" },
          { label: "Change Password", href: "/reset-password", icon: KeyRound, tone: "bg-warning/10 text-warning" },
        ].map((action) => (
          <Link key={action.label} href={action.href}>
            <Card className="transition-shadow hover:shadow-elevated">
              <CardContent className="flex items-center gap-3 p-5">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.tone}`}>
                  <action.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">My Payslips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(payslips ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No payslips yet. They&apos;ll appear here once payroll is processed and approved.
            </p>
          )}
          {(payslips ?? []).map((p) => {
            const period = p.payroll_periods as unknown as { period_label: string } | null;
            return (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{period?.period_label ?? "Payroll period"}</p>
                  <p className="text-xs text-muted-foreground">{p.payslip_number}</p>
                </div>
                <Badge variant="outline">{new Date(p.generated_at).toLocaleDateString()}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
