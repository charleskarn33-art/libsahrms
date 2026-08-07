import { z } from "zod";

export const leaveRequestSchema = z
  .object({
    leave_type: z.enum(["annual", "sick", "compassionate", "maternity", "paternity", "emergency", "unpaid"]),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    reason: z.string().optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
    message: "End date must be on or after the start date",
    path: ["end_date"],
  });
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
