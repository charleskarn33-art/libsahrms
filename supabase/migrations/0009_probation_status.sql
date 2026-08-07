-- =====================================================================
-- LIBSA HRMS — Add 'probation' as an employment status
--
-- Kept in its own migration: ALTER TYPE ... ADD VALUE must be committed
-- before the new value can be referenced by other statements.
-- =====================================================================

alter type employment_status add value if not exists 'probation';
