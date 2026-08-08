-- =====================================================================
-- LIBSA HRMS — Employee photo storage
--
-- A dedicated public bucket for employee profile photos, separate from
-- the private employee-documents bucket. Objects are stored as
-- {company_id}/{random-id}.{ext} — company scoping lives in the path
-- itself (not an employees row lookup) so HR can attach a photo while
-- still filling out a brand-new employee's form, before that employee
-- row exists.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employee-photos', 'employee-photos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "employee_photos_public_read" on storage.objects for select
  using (bucket_id = 'employee-photos');

create policy "employee_photos_company_write" on storage.objects for all
  using (bucket_id = 'employee-photos' and is_company_hr_or_admin(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'employee-photos' and is_company_hr_or_admin(((storage.foldername(name))[1])::uuid));
