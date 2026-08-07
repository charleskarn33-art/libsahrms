import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    redirect("/login");
  }

  const companyContext = await getCurrentCompany();

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role={companyContext?.company.role ?? profile.role}
        currentCompany={companyContext?.company ?? null}
        companies={companyContext?.all ?? []}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} unreadCount={unreadCount ?? 0} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
