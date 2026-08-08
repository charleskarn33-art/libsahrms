-- =====================================================================
-- LIBSA HRMS — Add 'payments_processed' as the final payroll approval stage
--
-- Completes the workflow after payslips are sent: HR Preparation ->
-- Finance Review -> Director Approval -> Payroll Locked -> Payslips
-- Generated -> Payments Processed. Kept in its own migration since
-- ALTER TYPE ... ADD VALUE must be committed before use.
-- =====================================================================

alter type payroll_approval_stage add value if not exists 'payments_processed';
