import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RoadmapPlaceholder({
  icon: Icon,
  title,
  description,
  phase,
  bullets,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
  bullets: string[];
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Badge variant="accent">{phase}</Badge>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        <ul className="mt-2 space-y-1.5 text-left text-sm text-muted-foreground">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {b}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
