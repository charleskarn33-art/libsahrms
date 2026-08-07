"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clockIn, clockOut } from "@/actions/attendance";

export function ClockWidget({ clockedInAt, clockedOutAt }: { clockedInAt: string | null; clockedOutAt: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle(action: "in" | "out") {
    setLoading(true);
    const result = action === "in" ? await clockIn() : await clockOut();
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(action === "in" ? "Clocked in" : "Clocked out");
    router.refresh();
  }

  return (
    <Card className="bg-gradient-primary text-white">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-sm text-white/80">Today&apos;s Attendance</p>
          <p className="mt-1 text-lg font-semibold">
            {clockedInAt ? `Clocked in at ${new Date(clockedInAt).toLocaleTimeString()}` : "You haven't clocked in yet"}
          </p>
          {clockedOutAt && (
            <p className="text-sm text-white/80">Clocked out at {new Date(clockedOutAt).toLocaleTimeString()}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handle("in")} disabled={loading || !!clockedInAt}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Clock In
          </Button>
          <Button
            variant="outline"
            className="border-white/40 bg-white/10 text-white hover:bg-white/20"
            onClick={() => handle("out")}
            disabled={loading || !clockedInAt || !!clockedOutAt}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Clock Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
