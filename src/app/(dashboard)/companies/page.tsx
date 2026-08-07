import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateCompanyDialog } from "@/components/companies/create-company-dialog";
import { NoCompanyState } from "@/components/layout/no-company-state";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const isPlatformAdmin = profile?.role === "super_admin";

  if (!isPlatformAdmin) {
    const { count } = await supabase.from("v_my_companies").select("company_id", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      redirect("/dashboard");
    }
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <NoCompanyState isPlatformAdmin={false} />
      </div>
    );
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, currency, is_active, company_memberships(count)")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">Client companies LIBSA Consultancy manages HR &amp; payroll for.</p>
        </div>
        <CreateCompanyDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(companies ?? []).map((c) => {
          const memberCount = (c.company_memberships as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <Link key={c.id} href={`/companies/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-elevated">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{c.name}</p>
                      <Badge variant={c.is_active ? "success" : "outline"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" /> {memberCount} staff members · {c.currency}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {(companies ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No companies yet — add your first client to get started.</p>
        )}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
