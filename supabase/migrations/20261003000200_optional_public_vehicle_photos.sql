-- Let customers view approved driver selfies and optional vehicle photos for bookable vehicles.
-- Photos stay in the private verification bucket and are exposed only through short-lived signed URLs.

alter table public.verification_documents
  drop constraint verification_documents_document_type_check,
  drop constraint verification_document_scope;

alter table public.verification_documents
  add constraint verification_documents_document_type_check
    check (document_type in ('aadhaar', 'selfie', 'registration', 'insurance', 'pollution', 'vehicle_photo')),
  add constraint verification_document_scope check (
    (vehicle_id is null and document_type in ('aadhaar', 'selfie'))
    or (vehicle_id is not null and document_type in ('registration', 'insurance', 'pollution', 'vehicle_photo'))
  );

alter table public.profiles add column show_driver_photo boolean not null default false;

create or replace function public.reset_verification_approval() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Display photos are optional and do not affect driver or vehicle eligibility.
  if new.document_type = 'vehicle_photo' then return new; end if;
  if public.is_admin() and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if new.vehicle_id is null then
      update public.profiles set owner_review_status = 'pending' where id = new.owner_id and owner_review_status is distinct from 'pending';
      update public.vehicles set review_status = 'pending', is_available = false where owner_id = new.owner_id and (review_status <> 'pending' or is_available);
    else
      update public.vehicles set review_status = 'pending', is_available = false where id = new.vehicle_id and (review_status <> 'pending' or is_available);
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.can_read_display_photo(p_document_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select viewer.role = 'customer' and not viewer.is_blocked
      and document.status = 'approved'
      and document.document_type in ('selfie', 'vehicle_photo')
      and not exists (
        select 1 from public.verification_documents newer
        where newer.owner_id = document.owner_id
          and newer.vehicle_id is not distinct from document.vehicle_id
          and newer.document_type = document.document_type
          and (newer.created_at > document.created_at or (newer.created_at = document.created_at and newer.id > document.id))
      )
      and case
        when document.document_type = 'selfie' then exists (
          select 1 from public.vehicles vehicle
          join public.profiles driver on driver.id = vehicle.owner_id
          where vehicle.owner_id = document.owner_id and driver.show_driver_photo and public.is_approved_vehicle(vehicle.id)
        )
        when document.document_type = 'vehicle_photo' then public.is_approved_vehicle(document.vehicle_id)
        else false
      end
    from public.verification_documents document
    join public.profiles viewer on viewer.id = (select auth.uid())
    where document.id = p_document_id
  ), false)
$$;
revoke all on function public.can_read_display_photo(uuid) from public, anon;
grant execute on function public.can_read_display_photo(uuid) to authenticated;

create policy "Customers read approved display photo metadata" on public.verification_documents
  for select to authenticated using (public.can_read_display_photo(id));

create policy "Customers read approved display photo files" on storage.objects
  for select to authenticated using (
    bucket_id = 'verification-documents'
    and exists (
      select 1 from public.verification_documents document
      where document.storage_path = name and public.can_read_display_photo(document.id)
    )
  );
