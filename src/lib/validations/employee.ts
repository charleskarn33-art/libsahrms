import { z } from "zod";

export const employeeSchema = z.object({
  employee_number: z.string().min(1, "Employee number is required"),
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional().or(z.literal("")),
  last_name: z.string().min(1, "Last name is required"),
  photo_url: z.string().optional().or(z.literal("")),

  gender: z.enum(["male", "female", "other"]).optional(),
  date_of_birth: z.string().optional().or(z.literal("")),
  marital_status: z.enum(["single", "married", "divorced", "widowed"]).optional(),
  nationality: z.string().optional().or(z.literal("")),
  county: z.string().optional().or(z.literal("")),
  district: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),

  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  emergency_contact_name: z.string().optional().or(z.literal("")),
  emergency_contact_phone: z.string().optional().or(z.literal("")),
  emergency_contact_relationship: z.string().optional().or(z.literal("")),

  department_id: z.string().uuid().optional().or(z.literal("")),
  position_id: z.string().uuid().optional().or(z.literal("")),
  supervisor_id: z.string().uuid().optional().or(z.literal("")),

  employment_type: z.enum(["full_time", "part_time", "contract", "intern", "temporary"]),
  employment_status: z.enum(["active", "probation", "on_leave", "suspended", "terminated", "resigned", "retired"]),
  date_hired: z.string().min(1, "Date hired is required"),

  salary_grade: z.string().optional().or(z.literal("")),
  basic_salary: z.coerce.number().min(0, "Must be zero or greater"),
  transport_allowance: z.coerce.number().min(0).default(0),
  housing_allowance: z.coerce.number().min(0).default(0),
  relocation_allowance: z.coerce.number().min(0).default(0),
  standard_bonus: z.coerce.number().min(0).default(0),
  standard_commission: z.coerce.number().min(0).default(0),

  bank_name: z.string().optional().or(z.literal("")),
  bank_account_number: z.string().optional().or(z.literal("")),
  orange_money_number: z.string().optional().or(z.literal("")),
  payment_method: z.enum(["bank", "orange_money", "cash"]),

  tin: z.string().optional().or(z.literal("")),
  nasscorp_number: z.string().optional().or(z.literal("")),
  tax_status: z.enum(["single", "married", "exempt"]),

  medical_information: z.string().optional().or(z.literal("")),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
