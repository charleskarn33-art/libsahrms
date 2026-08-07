"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaveRequestDialog } from "@/components/leave/leave-request-dialog";

const LeaveRequestDialogContext = createContext<(() => void) | null>(null);

export function useOpenLeaveRequestDialog() {
  const open = useContext(LeaveRequestDialogContext);
  if (!open) throw new Error("useOpenLeaveRequestDialog must be used within LeaveRequestDialogProvider");
  return open;
}

export function LeaveRequestDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <LeaveRequestDialogContext.Provider value={() => setOpen(true)}>
      {children}
      <LeaveRequestDialog open={open} onOpenChange={setOpen} hideTrigger />
    </LeaveRequestDialogContext.Provider>
  );
}

export function NewLeaveRequestButton() {
  const openDialog = useOpenLeaveRequestDialog();
  return (
    <Button variant="gradient" onClick={openDialog}>
      <Plus className="h-4 w-4" /> New Leave Request
    </Button>
  );
}
