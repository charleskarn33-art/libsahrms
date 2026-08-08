import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Wallet,
  HandCoins,
  Gift,
  BarChart3,
  CheckSquare,
  UserCircle,
  Settings,
  ShieldCheck,
  UsersRound,
  Bell,
  Landmark,
  Building,
} from "lucide-react";
import type { UserRole } from "@/types/database";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
  /** Key into the badge counts map passed to Sidebar, e.g. "approvals" */
  badgeKey?: string;
  children?: { label: string; href: string; badgeKey?: string }[];
}

const ALL_STAFF: UserRole[] = [
  "super_admin",
  "hr_manager",
  "payroll_officer",
  "finance_manager",
  "managing_director",
  "auditor",
];

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Employees",
    href: "/employees",
    icon: Users,
    roles: ALL_STAFF,
    children: [
      { label: "Employee Database", href: "/employees" },
      { label: "Add Employee", href: "/employees/new" },
      { label: "Departments", href: "/departments" },
      { label: "Positions", href: "/departments" },
      { label: "Org Chart", href: "/org-chart" },
    ],
  },
  { label: "Attendance", href: "/attendance", icon: Clock },
  {
    label: "Leave Management",
    href: "/leave",
    icon: CalendarDays,
    children: [
      { label: "Leave Dashboard", href: "/leave" },
      { label: "Leave Calendar", href: "/leave/calendar" },
      { label: "Leave Balance", href: "/leave/balance" },
      { label: "Public Holidays", href: "/leave/holidays" },
      { label: "Leave Settings", href: "/leave/settings" },
    ],
  },
  {
    label: "Payroll",
    href: "/payroll",
    icon: Wallet,
    roles: ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director"],
    children: [
      { label: "Payroll Dashboard", href: "/payroll" },
      { label: "Payroll Periods", href: "/payroll/periods" },
      { label: "Approve Payroll", href: "/approvals" },
      { label: "Payslips", href: "/payroll/payslips" },
      { label: "Payroll Settings", href: "/payroll/settings" },
    ],
  },
  {
    label: "Loans & Advances",
    href: "/loans",
    icon: HandCoins,
    roles: ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director"],
  },
  { label: "Benefits", href: "/benefits", icon: Gift, roles: ALL_STAFF },
  { label: "Tax & NASSCORP", href: "/nasscorp", icon: Landmark, roles: ALL_STAFF },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["super_admin", "hr_manager", "finance_manager", "managing_director", "auditor"],
    children: [
      { label: "Reports Home", href: "/reports" },
      { label: "Payroll Summary", href: "/reports/payroll" },
      { label: "Department Cost", href: "/reports/departments" },
      { label: "Tax & NASSCORP", href: "/nasscorp" },
      { label: "Bank & Orange Money", href: "/reports/payments" },
      { label: "Attendance", href: "/reports/attendance" },
      { label: "Leave", href: "/reports/leave" },
      { label: "Loans & Advances", href: "/reports/loans" },
    ],
  },
  {
    label: "Approvals",
    href: "/approvals",
    icon: CheckSquare,
    roles: ["super_admin", "hr_manager", "finance_manager", "managing_director"],
    badgeKey: "approvals",
  },
  { label: "Self Service", href: "/portal", icon: UserCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

export const NAV_ITEMS_ADMIN: NavItem[] = [
  { label: "Companies", href: "/companies", icon: Building, roles: ["super_admin"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["super_admin", "hr_manager"] },
  { label: "User Management", href: "/settings/users", icon: UsersRound, roles: ["super_admin"] },
  { label: "Audit Logs", href: "/audit-logs", icon: ShieldCheck, roles: ["super_admin", "auditor", "managing_director"] },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  hr_manager: "HR Manager",
  payroll_officer: "Payroll Officer",
  finance_manager: "Finance Manager",
  managing_director: "Managing Director",
  employee: "Employee",
  auditor: "Auditor",
};
