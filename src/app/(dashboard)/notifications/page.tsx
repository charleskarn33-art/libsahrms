import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { cn } from "@/lib/utils";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Payroll updates, leave decisions, and system alerts.</p>
        </div>
        <MarkAllReadButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(notifications ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>}
          {(notifications ?? []).map((n) => (
            <div
              key={n.id}
              className={cn("flex items-start gap-3 rounded-xl border border-border p-4", !n.is_read && "bg-primary/5 border-primary/20")}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
