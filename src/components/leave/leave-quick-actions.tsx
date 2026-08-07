"use client";

import Link from "next/link";
import { ChevronRight, CalendarPlus, CalendarDays, Wallet2, PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOpenLeaveRequestDialog } from "@/components/leave/leave-request-context";

export function LeaveQuickActions() {
  const openDialog = useOpenLeaveRequestDialog();
  const actions = [
    { label: "New Leave Request", description: "Apply for a new leave", icon: CalendarPlus, onClick: openDialog },
    { label: "Leave Calendar", description: "View leave calendar", icon: CalendarDays, href: "/leave/calendar" },
    { label: "My Leave Balance", description: "Check your leave balance", icon: Wallet2, href: "/leave/balance" },
    { label: "Public Holidays", description: "View holiday calendar", icon: PartyPopper, href: "/leave/holidays" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {actions.map((action) =>
          action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted"
            >
              <ActionIcon icon={action.icon} />
              <ActionText label={action.label} description={action.description} />
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ) : (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-muted"
            >
              <ActionIcon icon={action.icon} />
              <ActionText label={action.label} description={action.description} />
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          )
        )}
      </CardContent>
    </Card>
  );
}

function ActionIcon({ icon: Icon }: { icon: typeof CalendarPlus }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </div>
  );
}

function ActionText({ label, description }: { label: string; description: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium leading-tight">{label}</p>
      <p className="truncate text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
