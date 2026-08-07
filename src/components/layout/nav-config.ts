import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarDays,
  Wallet,
  HandCoins,
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
  children?: { label: string; href: string }[];
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
  { label: "Employees", href: "/employees", icon: Users, roles: ALL_STAFF },
  { label: "Departments", href: "/departments", icon: Building2, roles: ALL_STAFF },
  { label: "Attendance", href: "/attendance", icon: Clock },
  { label: "Leave Management", href: "/leave", icon: CalendarDays },
  {
    label: "Payroll",
    href: "/payroll",
    icon: Wallet,
    roles: ["super_admin", "hr_manager", "payroll_officer", "finance_manager", "managing_director"],
    children: [
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
  { label: "Tax & NASSCORP", href: "/nasscorp", icon: Landmark, roles: ALL_STAFF },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["super_admin", "hr_manager", "finance_manager", "managing_director", "auditor"],
  },
  {
    label: "Approvals",
    href: "/approvals",
    icon: CheckSquare,
    roles: ["super_admin", "hr_manager", "finance_manager", "managing_director"],
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
