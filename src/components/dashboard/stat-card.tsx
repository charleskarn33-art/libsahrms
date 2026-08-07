import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  trend,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  trend?: { direction: "up" | "down"; label: string };
  tone?: "primary" | "secondary" | "accent" | "warning" | "danger";
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary-700",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent/10 text-accent",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  };

  return (
    <Card className="transition-shadow hover:shadow-elevated">
      <CardContent className="flex items-start gap-4 p-5">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</p>
          {sublabel && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              {trend && (
                <span className={trend.direction === "up" ? "text-secondary" : "text-danger"}>
                  {trend.direction === "up" ? "↑" : "↓"} {trend.label}
                </span>
              )}
              {sublabel}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
