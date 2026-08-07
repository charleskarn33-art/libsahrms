import { FileText } from "lucide-react";
import { RoadmapPlaceholder } from "@/components/shared/roadmap-placeholder";

export default function PayslipsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payslips</h1>
        <p className="text-sm text-muted-foreground">Generate, download, and email professional PDF payslips.</p>
      </div>
      <RoadmapPlaceholder
        icon={FileText}
        title="PDF Payslip Generation & Delivery"
        description="The payroll_items, payslips, and payslip_deliveries tables (with per-employee RLS) are already in place. This phase wires up rendering and delivery."
        phase="Phase 4"
        bullets={[
          "Render branded PDF payslips with React PDF from locked payroll_items",
          "Store PDFs in a private Supabase Storage bucket, one object per employee",
          "Send each employee only their own payslip via the Resend API",
          "Track delivery status, retries, and open rate in payslip_deliveries",
          "Add QR code + unique payslip number for verification",
        ]}
      />
    </div>
  );
}
