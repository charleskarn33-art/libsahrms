import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  code: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  head_employee_id: z.string().uuid().optional().or(z.literal("")),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const positionSchema = z.object({
  title: z.string().min(1, "Position title is required"),
  department_id: z.string().uuid().optional().or(z.literal("")),
  salary_grade: z.string().optional().or(z.literal("")),
  min_salary: z.coerce.number().min(0).optional(),
  max_salary: z.coerce.number().min(0).optional(),
  description: z.string().optional().or(z.literal("")),
});
export type PositionInput = z.infer<typeof positionSchema>;
