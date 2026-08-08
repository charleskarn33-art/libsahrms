import { Users, Building2, UserCheck2, UserX2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function pct(n: number, total: number) {
  return total > 0 ? `${((n / total) * 100).toFixed(2)}%` : "0%";
}

function GenderGlyph({ symbol }: { symbol: string }) {
  return <span className="text-base font-bold leading-none">{symbol}</span>;
}

export function EmployeeStatCards({
  total,
  male,
  female,
  onProbation,
  inactive,
  departmentCount,
}: {
  total: number;
  male: number;
  female: number;
  onProbation: number;
  inactive: number;
  departmentCount: number;
}) {
  const cards = [
    { label: "Total Employees", value: total, sublabel: "Active Employees", icon: <Users className="h-5 w-5" />, tone: "bg-primary/10 text-primary" },
    { label: "Male Employees", value: male, sublabel: pct(male, total), icon: <GenderGlyph symbol="♂" />, tone: "bg-sky-500/10 text-sky-600" },
    { label: "Female Employees", value: female, sublabel: pct(female, total), icon: <GenderGlyph symbol="♀" />, tone: "bg-pink-500/10 text-pink-600" },
    { label: "On Probation", value: onProbation, sublabel: pct(onProbation, total), icon: <UserCheck2 className="h-5 w-5" />, tone: "bg-warning/10 text-warning" },
    { label: "Inactive Employees", value: inactive, sublabel: pct(inactive, total), icon: <UserX2 className="h-5 w-5" />, tone: "bg-muted-foreground/10 text-muted-foreground" },
    { label: "Departments", value: departmentCount, sublabel: "Total Departments", icon: <Building2 className="h-5 w-5" />, tone: "bg-secondary/10 text-secondary" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.tone}`}>{c.icon}</div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold leading-tight">{c.value}</p>
              <p className="text-[11px] text-muted-foreground">{c.sublabel}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
