import { Settings } from "lucide-react";
import { RoadmapPlaceholder } from "@/components/shared/roadmap-placeholder";

export default function LeaveSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Settings</h1>
        <p className="text-sm text-muted-foreground">Configure leave types, entitlements, and approval rules.</p>
      </div>
      <RoadmapPlaceholder
        icon={Settings}
        title="Leave Policy Configuration"
        description="leave_balances already stores per-employee, per-type entitlements — this phase adds a company-level policy editor that bulk-sets defaults instead of editing rows one at a time."
        phase="Phase 5"
        bullets={[
          "Default entitlement days per leave type, editable per company",
          "Bulk-apply entitlements to all employees for a new year",
          "Carry-over and expiry rules",
          "Configurable approval chain (single vs. multi-step)",
        ]}
      />
    </div>
  );
}
