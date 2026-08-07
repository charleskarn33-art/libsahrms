import Link from "next/link";
import { Bell, Gift, ShieldAlert, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/types/database";

const ICONS: Record<string, typeof Info> = { info: Info, gift: Gift, shield: ShieldAlert, bell: Bell };
const TONES: Record<string, string> = {
  info: "bg-secondary/10 text-secondary",
  gift: "bg-accent/10 text-accent",
  shield: "bg-warning/10 text-warning",
  bell: "bg-primary/10 text-primary",
};

export function Announcements({ items }: { items: Announcement[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Announcements</CardTitle>
        <Link href="/notifications" className="text-xs font-medium text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        {items.map((item) => {
          const Icon = ICONS[item.icon ?? "info"] ?? Info;
          return (
            <div key={item.id} className="flex gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES[item.icon ?? "info"]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                {item.body && <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(item.published_at)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
