-- =====================================================================
-- LIBSA HRMS — Extend v_employee_directory with gender + TIN
--
-- Needed by the Employee Database page (gender stat cards, TIN shown
-- under each employee's name). Appended at the end of the column list —
-- CREATE OR REPLACE VIEW cannot reorder or rename pre-existing columns.
-- =====================================================================

create or replace view v_employee_directory as
select
  e.id, e.employee_number, e.first_name, e.middle_name, e.last_name,
  e.first_name || ' ' || coalesce(e.middle_name || ' ', '') || e.last_name as full_name,
  e.photo_url, e.email, e.phone, e.employment_status, e.employment_type, e.date_hired,
  d.name as department_name, p.title as position_title,
  s.first_name || ' ' || s.last_name as supervisor_name,
  e.company_id,
  e.gender,
  e.tin
from employees e
left join departments d on d.id = e.department_id
left join positions p on p.id = e.position_id
left join employees s on s.id = e.supervisor_id;
