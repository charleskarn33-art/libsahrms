import { z } from "zod";

export const leaveTypeSettingsSchema = z.object({
  leave_type: z.enum(["annual", "sick", "maternity", "paternity", "compassionate", "emergency", "unpaid"]),
  default_days: z.coerce.number().min(0),
  max_carry_forward_days: z.coerce.number().min(0),
  is_paid: z.boolean(),
  is_active: z.boolean(),
});
export type LeaveTypeSettingsInput = z.infer<typeof leaveTypeSettingsSchema>;

export const leavePolicySchema = z.object({
  leave_year_start_month: z.coerce.number().min(1).max(12),
  probation_period_days: z.coerce.number().min(0),
  min_service_months: z.coerce.number().min(0),
  max_consecutive_leave_days: z.coerce.number().min(1),
  approval_lead_days: z.coerce.number().min(0),
  allow_half_day: z.boolean(),
  allow_backdated: z.boolean(),
  carry_forward_enabled: z.boolean(),
  encashment_enabled: z.boolean(),
});
export type LeavePolicyInput = z.infer<typeof leavePolicySchema>;
