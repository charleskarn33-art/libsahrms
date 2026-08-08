import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  label: string;
  actorName: string | null;
  createdAt: string;
  color: string;
}

export function PayrollActivities({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Activities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No payroll activity yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.color}`} />
            <div className="min-w-0">
              <p className="text-sm leading-snug">{item.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(item.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {item.actorName ? ` by ${item.actorName}` : ""}
              </p>
            </div>
          </div>
        ))}
        <Link href="/audit-logs" className="inline-block text-sm font-medium text-primary hover:underline">
          View All Activities
        </Link>
      </CardContent>
    </Card>
  );
}
