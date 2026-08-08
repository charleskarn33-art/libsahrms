import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateProviderDialog } from "@/components/benefits/create-provider-dialog";

export default async function BenefitProvidersPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const { data: providers } = await supabase
    .from("benefit_providers")
    .select("id, name, contact_email, contact_phone, is_active, benefit_plans(id)")
    .eq("company_id", companyId ?? "")
    .order("name");

  const rows = (providers ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    contactEmail: p.contact_email,
    contactPhone: p.contact_phone,
    isActive: p.is_active,
    planCount: (p.benefit_plans as unknown as { id: string }[])?.length ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/benefits">Benefits</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Benefit Providers</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benefit Providers</h1>
          <p className="text-sm text-muted-foreground">Insurers and administrators backing your benefit plans.</p>
        </div>
        <CreateProviderDialog />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0 pb-4 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Plans</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No benefit providers yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.contactEmail ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.contactPhone ?? "—"}</TableCell>
                  <TableCell>{r.planCount}</TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "success" : "outline"}>{r.isActive ? "Active" : "Inactive"}</Badge>
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
