import { z } from "zod";

export const benefitProviderSchema = z.object({
  name: z.string().min(1, "Provider name is required"),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
});
export type BenefitProviderInput = z.infer<typeof benefitProviderSchema>;

export const benefitPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  category: z.enum(["health", "dental", "vision", "life", "retirement", "wellness", "other"]),
  provider_id: z.string().uuid().optional().or(z.literal("")),
  description: z.string().optional(),
  company_contribution: z.coerce.number().min(0, "Must be zero or more"),
  employee_contribution: z.coerce.number().min(0, "Must be zero or more"),
});
export type BenefitPlanInput = z.infer<typeof benefitPlanSchema>;

export const benefitEnrollmentSchema = z.object({
  employee_id: z.string().uuid(),
  benefit_plan_id: z.string().uuid(),
  coverage_start_date: z.string().min(1, "Coverage start date is required"),
});
export type BenefitEnrollmentInput = z.infer<typeof benefitEnrollmentSchema>;

export const benefitDependentSchema = z.object({
  enrollment_id: z.string().uuid(),
  full_name: z.string().min(1, "Name is required"),
  relationship: z.enum(["spouse", "child", "other"]),
  date_of_birth: z.string().optional(),
});
export type BenefitDependentInput = z.infer<typeof benefitDependentSchema>;

export const benefitClaimSchema = z.object({
  employee_id: z.string().uuid(),
  benefit_plan_id: z.string().uuid(),
  description: z.string().optional(),
  amount_claimed: z.coerce.number().positive("Amount must be greater than zero"),
});
export type BenefitClaimInput = z.infer<typeof benefitClaimSchema>;

export const claimReviewSchema = z.object({
  claim_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  amount_approved: z.coerce.number().min(0).optional(),
  review_notes: z.string().optional(),
});
export type ClaimReviewInput = z.infer<typeof claimReviewSchema>;
