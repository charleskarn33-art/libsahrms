"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  getViewportForBounds,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import {
  Briefcase,
  Building2,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  FileImage,
  FileSpreadsheet,
  Maximize,
  Minimize,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Plus as PlusIcon,
  Scan,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DepartmentDialog } from "@/components/departments/department-dialog";
import { PositionDialog } from "@/components/departments/position-dialog";
import { EmployeeNode, type EmployeeNodeType } from "@/components/org-chart/employee-node";
import {
  buildOrgTree,
  buildParentMap,
  flattenVisible,
  layoutTree,
  type OrgEmployee,
  type OrgTreeNode,
  type Orientation,
} from "@/lib/org-chart";
import { toCsv, downloadCsv } from "@/lib/csv";

const nodeTypes = { employee: EmployeeNode };

export interface DepartmentLegendItem {
  name: string;
  color: string;
  count: number;
}

export interface OrgChartOverview {
  totalEmployees: number;
  totalDepartments: number;
  totalPositions: number;
  directReportsToCeo: number;
  averageSpanOfControl: number;
}

export function OrgChartClient({
  companyName,
  employees,
  departmentColors,
  legend,
  otherDepartmentCount,
  overview,
  employeeOptions,
  departmentOptions,
}: {
  companyName: string;
  employees: OrgEmployee[];
  departmentColors: Record<string, string>;
  legend: DepartmentLegendItem[];
  otherDepartmentCount: number;
  overview: OrgChartOverview;
  employeeOptions: { id: string; label: string }[];
  departmentOptions: { id: string; label: string }[];
}) {
  const roots = useMemo(() => buildOrgTree(employees), [employees]);

  return (
    <ReactFlowProvider>
      <OrgChartInner
        companyName={companyName}
        roots={roots}
        departmentColors={departmentColors}
        legend={legend}
        otherDepartmentCount={otherDepartmentCount}
        overview={overview}
        employeeOptions={employeeOptions}
        departmentOptions={departmentOptions}
      />
    </ReactFlowProvider>
  );
}

function OrgChartInner({
  roots,
  departmentColors,
  legend,
  otherDepartmentCount,
  overview,
  employeeOptions,
  departmentOptions,
}: {
  companyName: string;
  roots: OrgTreeNode[];
  departmentColors: Record<string, string>;
  legend: DepartmentLegendItem[];
  otherDepartmentCount: number;
  overview: OrgChartOverview;
  employeeOptions: { id: string; label: string }[];
  departmentOptions: { id: string; label: string }[];
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [search, setSearch] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const rf = useReactFlow();
  const { zoom } = useViewport();

  const parentById = useMemo(() => buildParentMap(roots), [roots]);
  const nodesWithChildren = useMemo(() => {
    const ids = new Set<string>();
    function walk(list: OrgTreeNode[]) {
      for (const n of list) {
        if (n.children.length) ids.add(n.id);
        walk(n.children);
      }
    }
    walk(roots);
    return ids;
  }, [roots]);

  const matchIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set<string>();
    const ids = new Set<string>();
    function walk(list: OrgTreeNode[]) {
      for (const n of list) {
        if (n.name.toLowerCase().includes(q) || (n.title ?? "").toLowerCase().includes(q)) ids.add(n.id);
        walk(n.children);
      }
    }
    walk(roots);
    return ids;
  }, [roots, search]);

  // Auto-expand ancestors of any search match so it's actually visible.
  useEffect(() => {
    if (matchIds.size === 0) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      let changed = false;
      matchIds.forEach((id) => {
        let p = parentById.get(id) ?? null;
        while (p) {
          if (next.has(p)) {
            next.delete(p);
            changed = true;
          }
          p = parentById.get(p) ?? null;
        }
      });
      return changed ? next : prev;
    });
  }, [matchIds, parentById]);

  const visible = useMemo(() => flattenVisible(roots, collapsed), [roots, collapsed]);
  const { positions } = useMemo(() => layoutTree(roots, collapsed, orientation), [roots, collapsed, orientation]);

  const nodes: EmployeeNodeType[] = useMemo(
    () =>
      visible.map((n) => {
        const pos = positions.get(n.id) ?? { x: 0, y: 0 };
        return {
          id: n.id,
          type: "employee",
          position: pos,
          draggable: false,
          connectable: false,
          selectable: false,
          data: {
            employee: n,
            color: n.departmentName ? departmentColors[n.departmentName] ?? "var(--dept-other)" : "var(--dept-other)",
            isRoot: parentById.get(n.id) === null,
            isMatch: matchIds.has(n.id),
            dimmed: matchIds.size > 0 && !matchIds.has(n.id),
            collapsed: collapsed.has(n.id),
            hasChildren: n.children.length > 0,
            directReports: n.children.length,
            orientation,
            onToggle: () =>
              setCollapsed((prev) => {
                const next = new Set(prev);
                if (next.has(n.id)) next.delete(n.id);
                else next.add(n.id);
                return next;
              }),
          },
        };
      }),
    [visible, positions, departmentColors, parentById, matchIds, collapsed, orientation]
  );

  const edges: Edge[] = useMemo(
    () =>
      visible
        .filter((n) => n.supervisorId && positions.has(n.supervisorId))
        .map((n) => ({
          id: `${n.supervisorId}-${n.id}`,
          source: n.supervisorId!,
          target: n.id,
          type: "smoothstep",
          style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
          pathOptions: { borderRadius: 12 },
        })),
    [visible, positions]
  );

  // Bring search matches into view once their layout position is known.
  useEffect(() => {
    if (matchIds.size === 0) return;
    const targets = nodes.filter((n) => matchIds.has(n.id));
    if (!targets.length) return;
    const t = setTimeout(() => rf.fitView({ nodes: targets, duration: 400, padding: 0.4, maxZoom: 1 }), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the match set (not layout identity) changes
  }, [matchIds]);

  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ duration: 300, padding: 0.2 }), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- orientation flips warrant a re-fit; node count changes don't need to yank the viewport
  }, [orientation]);

  function expandAll() {
    setCollapsed(new Set());
  }
  function collapseAll() {
    setCollapsed(new Set(nodesWithChildren));
  }

  function toggleFullscreen() {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }

  const handleExportPng = useCallback(async () => {
    setExporting(true);
    try {
      const bounds = rf.getNodesBounds(nodes);
      const padding = 60;
      const imageWidth = bounds.width + padding * 2;
      const imageHeight = bounds.height + padding * 2;
      const viewport = getViewportForBounds(bounds, imageWidth, imageHeight, 0.5, 2, 0.1);
      const el = wrapperRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
      if (!el) throw new Error("Chart not ready");

      const dataUrl = await toPng(el, {
        width: imageWidth,
        height: imageHeight,
        backgroundColor: "#ffffff",
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });
      const link = document.createElement("a");
      link.download = "org-chart.png";
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error("Couldn't export the chart as an image");
    } finally {
      setExporting(false);
    }
  }, [nodes, rf]);

  function handleExportCsv() {
    const rows = employeeOptionsForCsv(roots);
    const csv = toCsv(rows, [
      { key: "employee_number", label: "Employee ID" },
      { key: "name", label: "Name" },
      { key: "title", label: "Position" },
      { key: "department", label: "Department" },
      { key: "supervisor", label: "Reports To" },
      { key: "status", label: "Status" },
    ]);
    downloadCsv("org-chart-roster.csv", csv);
  }

  const visibleLegend = legend.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Chart</h1>
          <p className="text-sm text-muted-foreground">Visualize and explore the organizational structure.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="h-4 w-4" /> Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="h-4 w-4" /> Collapse All
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {orientation === "vertical" ? <MoveVertical className="h-4 w-4" /> : <MoveHorizontal className="h-4 w-4" />}
                Layout
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setOrientation("vertical")}>
                <MoveVertical className="h-4 w-4" /> Vertical (top-down)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOrientation("horizontal")}>
                <MoveHorizontal className="h-4 w-4" /> Horizontal (left-right)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting}>
                <Download className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPng}>
                <FileImage className="h-4 w-4" /> Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>
                <FileSpreadsheet className="h-4 w-4" /> Export roster as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <PositionDialog
            departments={departmentOptions}
            trigger={
              <Button variant="gradient" size="sm">
                <PlusIcon className="h-4 w-4" /> Add Position
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or position…"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => rf.fitView({ duration: 300, padding: 0.2 })}>
                <Scan className="h-4 w-4" /> Fit to Screen
              </Button>
              <div className="flex items-center gap-1 rounded-xl border border-border px-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => rf.zoomOut({ duration: 150 })}>
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-10 text-center text-xs font-medium tabular-nums text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => rf.zoomIn({ duration: 150 })}>
                  <PlusIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button variant="outline" size="icon" onClick={toggleFullscreen} title="Toggle fullscreen">
                {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div ref={wrapperRef} className="relative h-[600px] w-full bg-muted/20">
            {nodes.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8" />
                <p className="text-sm">No employees yet — add your first employee to start the chart.</p>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnScroll
                zoomOnScroll
                minZoom={0.2}
                maxZoom={1.75}
                fitView
                proOptions={{ hideAttribution: true }}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span className="font-medium">Legend:</span>
            {visibleLegend.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </span>
            ))}
            <span className="ml-auto flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Number of direct reports
            </span>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <OverviewRow label="Total Employees" value={overview.totalEmployees} />
              <OverviewRow label="Total Departments" value={overview.totalDepartments} />
              <OverviewRow label="Total Positions" value={overview.totalPositions} />
              <OverviewRow label="Direct Reports to CEO" value={overview.directReportsToCeo} />
              <OverviewRow label="Average Span of Control" value={overview.averageSpanOfControl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Departments</CardTitle>
              <Link href="/departments" className="text-xs font-medium text-primary hover:underline">
                View All
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {legend.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{d.count} Employees</span>
                </div>
              ))}
              {otherDepartmentCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--dept-other)" }} />
                    Other Departments
                  </span>
                  <span className="text-xs text-muted-foreground">{otherDepartmentCount} Employees</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <DepartmentDialog
                employees={employeeOptions}
                trigger={
                  <Button variant="ghost" className="h-auto w-full justify-start gap-3 px-2.5 py-2 font-normal">
                    <QuickActionContent icon={Building2} title="Add New Department" subtitle="Create a new department" />
                  </Button>
                }
              />
              <PositionDialog
                departments={departmentOptions}
                trigger={
                  <Button variant="ghost" className="h-auto w-full justify-start gap-3 px-2.5 py-2 font-normal">
                    <QuickActionContent icon={Briefcase} title="Add New Position" subtitle="Create a new position" />
                  </Button>
                }
              />
              <Button variant="ghost" asChild className="h-auto w-full justify-start gap-3 px-2.5 py-2 font-normal">
                <Link href="/employees">
                  <QuickActionContent icon={Users} title="Assign Employee" subtitle="Assign to a position" />
                </Link>
              </Button>
              <Button variant="ghost" asChild className="h-auto w-full justify-start gap-3 px-2.5 py-2 font-normal">
                <Link href="/reports">
                  <QuickActionContent icon={FileSpreadsheet} title="View Reports" subtitle="Generate org reports" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function QuickActionContent({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </>
  );
}

function employeeOptionsForCsv(roots: OrgTreeNode[]) {
  const rows: {
    employee_number: string;
    name: string;
    title: string;
    department: string;
    supervisor: string;
    status: string;
  }[] = [];

  function walk(node: OrgTreeNode, supervisorName: string) {
    rows.push({
      employee_number: node.employeeNumber,
      name: node.name,
      title: node.title ?? "",
      department: node.departmentName ?? "",
      supervisor: supervisorName,
      status: node.status,
    });
    node.children.forEach((c) => walk(c, node.name));
  }
  roots.forEach((r) => walk(r, ""));
  return rows;
}
