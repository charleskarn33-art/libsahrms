import { z } from "zod";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  currency: z.string().min(1).default("LRD"),
  employee_nasscorp_rate: z.coerce.number().min(0).max(100).default(4),
  employer_nasscorp_rate: z.coerce.number().min(0).max(100).default(6),
});
export type CompanyInput = z.infer<typeof companySchema>;

export { slugify };
