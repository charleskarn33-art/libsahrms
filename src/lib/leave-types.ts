import type { LeaveType } from "@/types/database";

export const LEAVE_TYPES: LeaveType[] = ["annual", "sick", "maternity", "paternity", "compassionate", "emergency", "unpaid"];

/** Presentation-only metadata for the fixed leave_type enum — not stored, since it's identity, not configuration. */
export const LEAVE_TYPE_META: Record<LeaveType, { code: string; category: string }> = {
  annual: { code: "ANL", category: "Annual" },
  sick: { code: "SIC", category: "Medical" },
  maternity: { code: "MAT", category: "Maternity" },
  paternity: { code: "PAT", category: "Paternity" },
  compassionate: { code: "COM", category: "Other" },
  emergency: { code: "EMG", category: "Other" },
  unpaid: { code: "UPL", category: "Other" },
};

/** Sensible starting defaults for a company that hasn't configured leave_type_settings yet. */
export const LEAVE_TYPE_DEFAULTS: Record<LeaveType, { default_days: number; max_carry_forward_days: number; is_paid: boolean }> = {
  annual: { default_days: 18, max_carry_forward_days: 5, is_paid: true },
  sick: { default_days: 12, max_carry_forward_days: 3, is_paid: true },
  maternity: { default_days: 90, max_carry_forward_days: 0, is_paid: true },
  paternity: { default_days: 7, max_carry_forward_days: 0, is_paid: true },
  compassionate: { default_days: 5, max_carry_forward_days: 0, is_paid: true },
  emergency: { default_days: 5, max_carry_forward_days: 0, is_paid: true },
  unpaid: { default_days: 0, max_carry_forward_days: 0, is_paid: false },
};

export const DEFAULT_LEAVE_POLICY = {
  leave_year_start_month: 1,
  probation_period_days: 90,
  min_service_months: 1,
  max_consecutive_leave_days: 30,
  approval_lead_days: 2,
  allow_half_day: true,
  allow_backdated: false,
  carry_forward_enabled: true,
  encashment_enabled: true,
};

export function leaveTypeLabel(type: LeaveType) {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} Leave`;
}
