import { Network } from "lucide-react";
import { RoadmapPlaceholder } from "@/components/shared/roadmap-placeholder";

export default function OrgChartPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Org Chart</h1>
        <p className="text-sm text-muted-foreground">Visualize reporting lines across the organization.</p>
      </div>
      <RoadmapPlaceholder
        icon={Network}
        title="Interactive Org Chart"
        description="Every employee already has a supervisor_id, so the reporting hierarchy the chart needs already exists in the database — this phase is purely the visualization layer."
        phase="Phase 5"
        bullets={[
          "Tree view built from employees.supervisor_id",
          "Click into a manager to expand their direct reports",
          "Department and headcount overlays",
          "Export as PDF/PNG for offline sharing",
        ]}
      />
    </div>
  );
}
