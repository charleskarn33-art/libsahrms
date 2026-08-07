import { Gift } from "lucide-react";
import { RoadmapPlaceholder } from "@/components/shared/roadmap-placeholder";

export default function BenefitsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Benefits</h1>
        <p className="text-sm text-muted-foreground">Manage employee benefit plans and enrollment.</p>
      </div>
      <RoadmapPlaceholder
        icon={Gift}
        title="Benefits Administration"
        description="Not yet modeled in the schema — this phase adds benefit plans, per-employee enrollment, and cost tracking that can feed into the payroll engine's deductions."
        phase="Phase 6"
        bullets={[
          "Benefit plan catalog (medical, dental, life, retirement)",
          "Per-employee enrollment and dependent tracking",
          "Employer vs. employee cost split, feeding payroll deductions",
          "Open enrollment windows and eligibility rules",
        ]}
      />
    </div>
  );
}
