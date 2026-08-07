import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();

  let { data: settings } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();

  if (!settings) {
    const { data: created } = await supabase.from("company_settings").insert({}).select("*").single();
    settings = created;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Company information, tax rates, and NASSCORP configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company &amp; Payroll Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {settings && (
            <CompanySettingsForm
              id={settings.id}
              defaultValues={{
                company_name: settings.company_name,
                address: settings.address ?? "",
                phone: settings.phone ?? "",
                email: settings.email ?? "",
                tin: settings.tin ?? "",
                nasscorp_employer_number: settings.nasscorp_employer_number ?? "",
                employee_nasscorp_rate: settings.employee_nasscorp_rate,
                employer_nasscorp_rate: settings.employer_nasscorp_rate,
                currency: settings.currency,
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
