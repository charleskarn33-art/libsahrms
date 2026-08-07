import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { SelectCompanyPicker } from "@/components/companies/select-company-picker";
import { NoCompanyState } from "@/components/layout/no-company-state";

export default async function SelectCompanyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const context = await getCurrentCompany();

  if (!context) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role === "super_admin") {
      redirect("/companies");
    }
    return <NoCompanyState isPlatformAdmin={false} />;
  }

  if (context.all.length === 1) {
    redirect("/dashboard");
  }

  return <SelectCompanyPicker companies={context.all} />;
}

export const dynamic = "force-dynamic";
