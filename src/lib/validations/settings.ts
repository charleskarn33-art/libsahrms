import { z } from "zod";

export const companySettingsSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  tin: z.string().optional().or(z.literal("")),
  nasscorp_employer_number: z.string().optional().or(z.literal("")),
  employee_nasscorp_rate: z.coerce.number().min(0).max(100),
  employer_nasscorp_rate: z.coerce.number().min(0).max(100),
  currency: z.string().min(1),
});
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
