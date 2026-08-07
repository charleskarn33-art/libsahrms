import { Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoadmapPlaceholder } from "@/components/shared/roadmap-placeholder";

export default async function NasscorpPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
  const { data: latestSummary } = await supabase
    .from("v_payroll_period_summary")
    .select("*")
    .order("payroll_period_id", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tax &amp; NASSCORP</h1>
        <p className="text-sm text-muted-foreground">Statutory contribution rates and withholding tax configuration.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Employee NASSCORP Rate</p>
            <p className="mt-1 text-2xl font-bold">{settings?.employee_nasscorp_rate ?? 4}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Employer NASSCORP Rate</p>
            <p className="mt-1 text-2xl font-bold">{settings?.employer_nasscorp_rate ?? 6}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Latest Period Income Tax</p>
            <p className="mt-1 text-2xl font-bold">{Number(latestSummary?.total_income_tax ?? 0).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <RoadmapPlaceholder
        icon={Landmark}
        title="Detailed NASSCORP & Tax Reports"
        description="Rates are configurable in Settings and already drive the calculate_income_tax and compute_payroll_item database functions used by the payroll engine."
        phase="Phase 5"
        bullets={[
          "Printable NASSCORP remittance report per period",
          "Progressive income tax band editor",
          "Employee-level tax status overrides",
          "Export to PDF / Excel / CSV",
        ]}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";
