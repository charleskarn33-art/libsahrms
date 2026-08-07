import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { InviteMemberDialog } from "@/components/companies/invite-member-dialog";
import { RemoveMemberButton } from "@/components/companies/remove-member-button";
import { ROLE_LABELS } from "@/components/layout/nav-config";
import { initials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (!company) {
    notFound();
  }

  const { data: memberships } = await supabase
    .from("company_memberships")
    .select("id, role, profile_id, profiles(full_name, email, avatar_url)")
    .eq("company_id", id)
    .order("created_at");

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/companies">
          <ArrowLeft className="h-4 w-4" /> Back to Companies
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
        <p className="text-sm text-muted-foreground">Manage this client&apos;s settings and staff assignments.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanySettingsForm
              id={company.id}
              defaultValues={{
                company_name: company.name,
                address: company.address ?? "",
                phone: company.phone ?? "",
                email: company.email ?? "",
                tin: company.tin ?? "",
                nasscorp_employer_number: company.nasscorp_employer_number ?? "",
                employee_nasscorp_rate: company.employee_nasscorp_rate,
                employer_nasscorp_rate: company.employer_nasscorp_rate,
                currency: company.currency,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Team</CardTitle>
            <InviteMemberDialog companyId={id} />
          </CardHeader>
          <CardContent className="space-y-2">
            {(memberships ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No staff assigned yet.</p>
            )}
            {(memberships ?? []).map((m) => {
              const p = m.profiles as unknown as { full_name: string; email: string; avatar_url: string | null } | null;
              return (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p?.avatar_url ?? undefined} alt={p?.full_name ?? ""} />
                      <AvatarFallback>{initials(p?.full_name ?? "?")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-tight">{p?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{p?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ROLE_LABELS[m.role as UserRole]}</Badge>
                    <RemoveMemberButton companyId={id} profileId={m.profile_id} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
