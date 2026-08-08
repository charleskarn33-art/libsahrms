import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreatePlanDialog } from "@/components/benefits/create-plan-dialog";
import { formatCurrency } from "@/lib/utils";
import type { BenefitCategory, BenefitPlanStatus } from "@/types/database";

const CATEGORY_LABEL: Record<BenefitCategory, string> = {
  health: "Health",
  dental: "Dental",
  vision: "Vision",
  life: "Life",
  retirement: "Retirement",
  wellness: "Wellness",
  other: "Other",
};

export default async function BenefitPlansPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const { data: company } = await supabase.from("companies").select("currency").eq("id", companyId ?? "").maybeSingle();
  const { data: providers } = await supabase.from("benefit_providers").select("id, name").eq("company_id", companyId ?? "").order("name");
  const { data: plans } = await supabase
    .from("benefit_plans")
    .select("id, name, category, status, company_contribution, employee_contribution, benefit_providers(name), benefit_enrollments(status)")
    .eq("company_id", companyId ?? "")
    .order("created_at");

  const rows = (plans ?? []).map((p) => {
    const provider = p.benefit_providers as unknown as { name: string } | null;
    const enrollments = (p.benefit_enrollments as unknown as { status: string }[]) ?? [];
    const enrolledCount = enrollments.filter((e) => e.status === "active").length;
    return {
      id: p.id,
      name: p.name,
      category: p.category as BenefitCategory,
      status: p.status as BenefitPlanStatus,
      providerName: provider?.name ?? "—",
      companyContribution: Number(p.company_contribution),
      employeeContribution: Number(p.employee_contribution),
      enrolledCount,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/benefits">Benefits</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Benefit Plans</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benefit Plans</h1>
          <p className="text-sm text-muted-foreground">The full catalog of benefit plans your company offers.</p>
        </div>
        <CreatePlanDialog providers={providers ?? []} />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0 pb-4 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Company Contribution</TableHead>
                <TableHead>Employee Contribution</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No benefit plans yet. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="capitalize">{CATEGORY_LABEL[r.category]}</TableCell>
                  <TableCell>{r.providerName}</TableCell>
                  <TableCell>{r.enrolledCount}</TableCell>
                  <TableCell>{formatCurrency(r.companyContribution, company?.currency)}</TableCell>
                  <TableCell>{formatCurrency(r.employeeContribution, company?.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "active" ? "success" : "outline"} className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
