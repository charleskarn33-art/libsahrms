import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmitClaimDialog } from "@/components/benefits/submit-claim-dialog";
import { ReviewClaimDialog } from "@/components/benefits/review-claim-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BenefitClaimStatus } from "@/types/database";

const STATUS_VARIANT: Record<BenefitClaimStatus, "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

export default async function BenefitClaimsPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const [{ data: company }, { data: employees }, { data: plans }, { data: claims }] = await Promise.all([
    supabase.from("companies").select("currency").eq("id", companyId ?? "").maybeSingle(),
    supabase.from("employees").select("id, first_name, last_name").eq("company_id", companyId ?? "").order("first_name"),
    supabase.from("benefit_plans").select("id, name").eq("company_id", companyId ?? "").eq("status", "active").order("name"),
    supabase
      .from("benefit_claims")
      .select(
        "id, claim_number, amount_claimed, amount_approved, status, submitted_at, employees(first_name, last_name, employee_number), benefit_plans(name)"
      )
      .eq("company_id", companyId ?? "")
      .order("submitted_at", { ascending: false }),
  ]);

  const employeeOptions = (employees ?? []).map((e) => ({ id: e.id, label: `${e.first_name} ${e.last_name}` }));
  const planOptions = (plans ?? []).map((p) => ({ id: p.id, label: p.name }));

  const rows = (claims ?? []).map((c) => {
    const emp = c.employees as unknown as { first_name: string; last_name: string; employee_number: string } | null;
    const plan = c.benefit_plans as unknown as { name: string } | null;
    return {
      id: c.id,
      claimNumber: c.claim_number,
      employeeLabel: emp ? `${emp.first_name} ${emp.last_name}` : "—",
      employeeNumber: emp?.employee_number ?? "—",
      planName: plan?.name ?? "—",
      amountClaimed: Number(c.amount_claimed),
      amountApproved: c.amount_approved !== null ? Number(c.amount_approved) : null,
      status: c.status as BenefitClaimStatus,
      submittedAt: c.submitted_at,
    };
  });

  const totals = {
    total: rows.length,
    approved: rows.filter((r) => r.status === "approved").length,
    pending: rows.filter((r) => r.status === "pending").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/benefits">Benefits</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Claims Management</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claims Management</h1>
          <p className="text-sm text-muted-foreground">
            {totals.total} claim(s) — {totals.approved} approved, {totals.pending} pending, {totals.rejected} rejected
          </p>
        </div>
        <SubmitClaimDialog employees={employeeOptions} plans={planOptions} />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0 pb-4 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount Claimed</TableHead>
                <TableHead>Amount Approved</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No claims filed yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.claimNumber}</TableCell>
                  <TableCell>
                    <p className="leading-tight">{r.employeeLabel}</p>
                    <p className="text-xs text-muted-foreground">{r.employeeNumber}</p>
                  </TableCell>
                  <TableCell>{r.planName}</TableCell>
                  <TableCell>{formatCurrency(r.amountClaimed, company?.currency)}</TableCell>
                  <TableCell>{r.amountApproved !== null ? formatCurrency(r.amountApproved, company?.currency) : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.submittedAt)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "pending" && (
                      <div className="flex items-center justify-end gap-1">
                        <ReviewClaimDialog claimId={r.id} claimNumber={r.claimNumber} amountClaimed={r.amountClaimed} decision="approved" />
                        <ReviewClaimDialog claimId={r.id} claimNumber={r.claimNumber} amountClaimed={r.amountClaimed} decision="rejected" />
                      </div>
                    )}
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
