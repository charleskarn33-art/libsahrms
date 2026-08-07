export type UserRole =
  | "super_admin"
  | "hr_manager"
  | "payroll_officer"
  | "finance_manager"
  | "managing_director"
  | "employee"
  | "auditor";

export type EmploymentType = "full_time" | "part_time" | "contract" | "intern" | "temporary";
export type EmploymentStatus = "active" | "probation" | "on_leave" | "suspended" | "terminated" | "resigned" | "retired";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed";
export type Gender = "male" | "female" | "other";
export type TaxStatus = "single" | "married" | "exempt";

export type AttendanceStatus = "present" | "late" | "early_leave" | "absent" | "holiday" | "weekend" | "on_leave";
export type LoanStatus = "pending" | "approved" | "active" | "completed" | "rejected" | "cancelled";

export type LeaveType =
  | "annual"
  | "sick"
  | "compassionate"
  | "maternity"
  | "paternity"
  | "emergency"
  | "unpaid";
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type PayrollFrequency = "monthly" | "biweekly" | "weekly";
export type PayrollStatus = "draft" | "pending" | "approved" | "locked" | "paid" | "cancelled";
export type PayrollApprovalStage =
  | "hr_preparation"
  | "finance_review"
  | "director_approval"
  | "payroll_locked"
  | "payslips_sent"
  | "payments_processed";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  two_factor_enabled: boolean;
  default_company_id: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tin: string | null;
  nasscorp_employer_number: string | null;
  employee_nasscorp_rate: number;
  employer_nasscorp_rate: number;
  income_tax_bands: { upTo: number | null; rate: number }[];
  payroll_frequency: PayrollFrequency;
  currency: string;
  orange_money_fee_flat: number;
  orange_money_fee_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyMembership {
  id: string;
  company_id: string;
  profile_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface MyCompanyRow {
  company_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: UserRole;
  is_platform_admin: boolean;
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  description: string | null;
  head_employee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  company_id: string;
  title: string;
  department_id: string | null;
  salary_grade: string | null;
  min_salary: number | null;
  max_salary: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  company_id: string;
  profile_id: string | null;
  employee_number: string;

  first_name: string;
  middle_name: string | null;
  last_name: string;
  photo_url: string | null;

  gender: Gender | null;
  date_of_birth: string | null;
  marital_status: MaritalStatus | null;
  nationality: string | null;
  county: string | null;
  district: string | null;
  address: string | null;

  phone: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;

  department_id: string | null;
  position_id: string | null;
  supervisor_id: string | null;

  employment_type: EmploymentType;
  employment_status: EmploymentStatus;
  date_hired: string;
  date_terminated: string | null;

  salary_grade: string | null;
  basic_salary: number;
  transport_allowance: number;
  housing_allowance: number;
  relocation_allowance: number;
  standard_bonus: number;
  standard_commission: number;

  bank_name: string | null;
  bank_account_number: string | null;
  orange_money_number: string | null;
  payment_method: "bank" | "orange_money" | "cash";

  tin: string | null;
  nasscorp_number: string | null;
  tax_status: TaxStatus;

  medical_information: string | null;

  created_at: string;
  updated_at: string;
}

export interface EmployeeDirectoryRow {
  id: string;
  employee_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  employment_status: EmploymentStatus;
  employment_type: EmploymentType;
  date_hired: string;
  department_name: string | null;
  position_title: string | null;
  supervisor_name: string | null;
  company_id: string;
  gender: Gender | null;
  tin: string | null;
}

export interface PayrollPeriod {
  id: string;
  company_id: string;
  period_label: string;
  frequency: PayrollFrequency;
  period_start: string;
  period_end: string;
  payment_date: string | null;
  status: PayrollStatus;
  approval_stage: PayrollApprovalStage;
  finance_decision: "pending" | "approved" | "rejected";
  director_decision: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriodSummary {
  payroll_period_id: string;
  company_id: string;
  period_label: string;
  status: PayrollStatus;
  approval_stage: PayrollApprovalStage;
  employee_count: number;
  total_gross: number;
  total_net: number;
  total_employee_nasscorp: number;
  total_employer_nasscorp: number;
  total_income_tax: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string | null;
  status: LeaveRequestStatus;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  icon: string | null;
  published_at: string;
}
