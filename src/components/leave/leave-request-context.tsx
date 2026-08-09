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

export function LeaveRequestDialogProvider({
  children,
  employeeOptions,
}: {
  children: ReactNode;
  /** Pass the company's employee list to let HR/Admin set leave on behalf of anyone. Omit for self-service only. */
  employeeOptions?: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <LeaveRequestDialogContext.Provider value={() => setOpen(true)}>
      {children}
      <LeaveRequestDialog open={open} onOpenChange={setOpen} hideTrigger employeeOptions={employeeOptions} />
    </LeaveRequestDialogContext.Provider>
  );
}

export function NewLeaveRequestButton({ isHrMode = false }: { isHrMode?: boolean }) {
  const openDialog = useOpenLeaveRequestDialog();
  return (
    <Button variant="gradient" onClick={openDialog}>
      <Plus className="h-4 w-4" /> {isHrMode ? "Set Leave for Employee" : "New Leave Request"}
    </Button>
  );
}
