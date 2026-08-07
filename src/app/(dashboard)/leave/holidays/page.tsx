import Link from "next/link";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateHolidayDialog } from "@/components/leave/create-holiday-dialog";
import { DeleteHolidayButton } from "@/components/leave/delete-holiday-button";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const HR_ROLES: UserRole[] = ["super_admin", "hr_manager"];

export default async function PublicHolidaysPage() {
  const supabase = await createClient();
  const companyId = await getCurrentCompanyId();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const isHr = profile ? HR_ROLES.includes(profile.role as UserRole) : false;

  const now = new Date();
  const { data: holidays } = await supabase
    .from("public_holidays")
    .select("id, name, holiday_date")
    .eq("company_id", companyId ?? "")
    .order("holiday_date");

  const upcoming = (holidays ?? []).filter((h) => new Date(h.holiday_date) >= new Date(now.toISOString().slice(0, 10)));
  const past = (holidays ?? []).filter((h) => new Date(h.holiday_date) < new Date(now.toISOString().slice(0, 10)));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/leave">
          <ArrowLeft className="h-4 w-4" /> Back to Leave Dashboard
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Public Holidays</h1>
          <p className="text-sm text-muted-foreground">{now.getFullYear()} holiday calendar for your company.</p>
        </div>
        {isHr && <CreateHolidayDialog />}
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {(holidays ?? []).length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No holidays added yet.</p>
          )}
          {upcoming.map((h) => (
            <div key={h.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <PartyPopper className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium leading-tight">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(h.holiday_date, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              </div>
              {isHr && <DeleteHolidayButton id={h.id} />}
            </div>
          ))}
          {past.length > 0 && (
            <>
              <div className="bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Past</div>
              {past.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <PartyPopper className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium leading-tight">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(h.holiday_date, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                  </div>
                  {isHr && <DeleteHolidayButton id={h.id} />}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
