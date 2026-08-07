import { z } from "zod";

export const loanRequestSchema = z.object({
  loan_type: z.enum(["loan", "salary_advance"]),
  principal_amount: z.coerce.number().positive("Amount must be greater than zero"),
  monthly_deduction: z.coerce.number().positive("Monthly deduction must be greater than zero"),
  notes: z.string().optional().or(z.literal("")),
});
export type LoanRequestInput = z.infer<typeof loanRequestSchema>;
