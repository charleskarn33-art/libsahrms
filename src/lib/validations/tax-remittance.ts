import { z } from "zod";

export const taxRemittanceSchema = z.object({
  payroll_period_id: z.string().uuid(),
  payment_date: z.string().min(1, "Payment date is required"),
  receipt_reference: z.string().min(1, "Receipt / reference number is required"),
  notes: z.string().optional(),
});
export type TaxRemittanceInput = z.infer<typeof taxRemittanceSchema>;
