"use client";

import Link from "next/link";
import { ChevronDown, Users } from "lucide-react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import type { OrgTreeNode } from "@/lib/org-chart";

export interface EmployeeNodeData extends Record<string, unknown> {
  employee: OrgTreeNode;
  color: string;
  isRoot: boolean;
  isMatch: boolean;
  dimmed: boolean;
  collapsed: boolean;
  hasChildren: boolean;
  directReports: number;
  orientation: "vertical" | "horizontal";
  onToggle: () => void;
}

export type EmployeeNodeType = Node<EmployeeNodeData, "employee">;

export function EmployeeNode({ data }: NodeProps<EmployeeNodeType>) {
  const { employee, color, isRoot, isMatch, dimmed, collapsed, hasChildren, directReports, orientation } = data;
  const isVertical = orientation === "vertical";
  const isActive = employee.status === "active";

  return (
    <div
      className={cn(
        "relative w-[208px] rounded-2xl border bg-card p-3.5 text-center shadow-soft transition-opacity",
        isRoot ? "border-primary/60 ring-1 ring-primary/20" : "border-border",
        isMatch && "ring-2 ring-warning",
        dimmed && "opacity-35"
      )}
    >
      <Handle
        type="target"
        position={isVertical ? Position.Top : Position.Left}
        className="!invisible"
      />
      <Link href={`/employees/${employee.id}`} className="block">
        <Avatar className="mx-auto h-12 w-12">
          <AvatarImage src={employee.photoUrl ?? undefined} alt={employee.name} />
          <AvatarFallback>{initials(employee.name)}</AvatarFallback>
        </Avatar>
        <p className="mt-2 truncate text-sm font-semibold" style={{ color: isRoot ? undefined : color }}>
          {employee.title ?? "—"}
        </p>
        <p className="flex items-center justify-center gap-1 truncate text-sm font-medium">
          {employee.name}
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", isActive ? "bg-secondary" : "bg-muted-foreground/40")}
            title={employee.status}
          />
        </p>
        <p className="truncate text-xs text-muted-foreground">{employee.employeeNumber}</p>
      </Link>

      {hasChildren && (
        <button
          type="button"
          onClick={data.onToggle}
          className="absolute -bottom-3.5 left-1/2 flex h-7 -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-primary-700 px-2.5 text-xs font-semibold text-white shadow-soft"
        >
          <Users className="h-3 w-3" />
          {directReports}
          <ChevronDown className={cn("h-3 w-3 transition-transform", collapsed && "-rotate-90")} />
        </button>
      )}

      <Handle
        type="source"
        position={isVertical ? Position.Bottom : Position.Right}
        className="!invisible"
      />
    </div>
  );
}
