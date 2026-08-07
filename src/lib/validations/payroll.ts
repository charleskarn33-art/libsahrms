import { z } from "zod";

export const payrollPeriodSchema = z
  .object({
    period_label: z.string().min(1, "Label is required"),
    frequency: z.enum(["monthly", "biweekly", "weekly"]),
    period_start: z.string().min(1, "Start date is required"),
    period_end: z.string().min(1, "End date is required"),
    payment_date: z.string().optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.period_end) >= new Date(data.period_start), {
    message: "End date must be on or after the start date",
    path: ["period_end"],
  });
export type PayrollPeriodInput = z.infer<typeof payrollPeriodSchema>;
