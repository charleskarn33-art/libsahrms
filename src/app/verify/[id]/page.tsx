import { ShieldCheck, ShieldX } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

function Logo({ src, name }: { src: string | null; name: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- remote logo URL, next/image would need domain config
    return <img src={src} alt={name} className="mx-auto h-14 object-contain" />;
  }
  return <p className="text-xl font-bold tracking-tight">{name}</p>;
}

export default async function VerifyPayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const { data: payslip } = uuidPattern.test(id)
    ? await supabase
        .from("payslips")
        .select(
          `payslip_number, generated_at,
           employees(first_name, last_name),
           companies(name, logo_url),
           payroll_periods(period_label)`
        )
        .eq("id", id)
        .maybeSingle()
    : { data: null };

  const employee = payslip?.employees as unknown as { first_name: string; last_name: string } | null;
  const company = payslip?.companies as unknown as { name: string; logo_url: string | null } | null;
  const period = payslip?.payroll_periods as unknown as { period_label: string } | null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle p-6 dark:bg-background">
      <div className="w-full max-w-sm animate-fade-in rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {payslip ? (
          <>
            <Logo src={company?.logo_url ?? null} name={company?.name ?? "LIBSA HRMS"} />
            <div className="mt-6 flex items-center justify-center gap-2 text-secondary">
              <ShieldCheck className="h-6 w-6" />
              <p className="text-lg font-semibold">Payslip Verified</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              This payslip was genuinely issued by {company?.name ?? "this company"}.
            </p>

            <dl className="mt-6 space-y-2 rounded-xl bg-muted/50 p-4 text-left text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Employee</dt>
                <dd className="font-medium">
                  {employee ? `${employee.first_name} ${employee.last_name}` : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Payslip No.</dt>
                <dd className="font-medium">{payslip.payslip_number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Period</dt>
                <dd className="font-medium">{period?.period_label ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Generated</dt>
                <dd className="font-medium">{formatDate(payslip.generated_at)}</dd>
              </div>
            </dl>
            <p className="mt-6 text-xs text-muted-foreground">
              Salary figures are confidential and are not shown on this page.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 text-danger">
              <ShieldX className="h-6 w-6" />
              <p className="text-lg font-semibold">Not a Recognized Payslip</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              This QR code doesn&apos;t match any payslip on record. If you believe this is an error, contact the
              issuing company&apos;s HR department.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
