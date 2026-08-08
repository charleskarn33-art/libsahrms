import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // RLS (payslips_self_select) already restricts this to the owning employee
  // or that company's payroll staff — a row we can't see means no access.
  const { data: payslip, error } = await supabase
    .from("payslips")
    .select("storage_path, payslip_number")
    .eq("id", id)
    .maybeSingle();

  if (error || !payslip) {
    return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
  }

  const { data: file, error: downloadError } = await supabase.storage.from("payslips").download(payslip.storage_path);
  if (downloadError || !file) {
    return NextResponse.json({ error: "Could not load payslip file" }, { status: 404 });
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  const bytes = await file.arrayBuffer();

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${payslip.payslip_number}.pdf"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
