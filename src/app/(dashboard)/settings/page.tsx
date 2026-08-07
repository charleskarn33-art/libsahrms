import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const companyContext = await getCurrentCompany();

  if (!companyContext) {
    return (
      <div className="text-sm text-muted-foreground">Select a company first to manage its settings.</div>
    );
  }

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyContext.company.company_id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Company information, tax rates, and NASSCORP configuration for {companyContext.company.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company &amp; Payroll Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {company && (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
