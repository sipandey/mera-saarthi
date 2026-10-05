-- Private evidence uploads and document-level reviews for driver and vehicle approval.

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  document_type text not null check (document_type in ('aadhaar', 'selfie', 'registration', 'insurance', 'pollution')),
  storage_path text not null unique,
  status public.review_status not null default 'pending',
  expires_on date,
  rejection_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  constraint verification_document_scope check (
    (vehicle_id is null and document_type in ('aadhaar', 'selfie'))
    or (vehicle_id is not null and document_type in ('registration', 'insurance', 'pollution'))
  ),
  constraint verification_expiry_required check (
    document_type not in ('insurance', 'pollution') or expires_on is not null
  ),
  constraint verification_storage_owner_prefix check (storage_path like owner_id::text || '/%')
);
alter table public.vehicles add column registration_updated_at timestamptz not null default now();
create index verification_documents_owner_idx on public.verification_documents (owner_id, document_type, created_at desc);
create index verification_documents_vehicle_idx on public.verification_documents (vehicle_id, document_type, created_at desc);
alter table public.verification_documents enable row level security;
revoke all on table public.verification_documents from anon;
grant select, insert, update on table public.verification_documents to authenticated;
create policy "Owners and admins read verification documents" on public.verification_documents
  for select to authenticated using (public.is_admin() or owner_id = (select auth.uid()));
create policy "Owners submit verification documents" on public.verification_documents
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and public.is_active_user()
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner')
    and status = 'pending' and reviewed_at is null and reviewed_by is null
    and (vehicle_id is null or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())))
  );
create policy "Admins review verification documents" on public.verification_documents
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-documents', 'verification-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
create policy "Owners upload private verification files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_user()
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner')
  );
create policy "Owners and admins read private verification files" on storage.objects
  for select to authenticated using (
    bucket_id = 'verification-documents'
    and (public.is_admin() or (storage.foldername(name))[1] = (select auth.uid())::text)
  );

create or replace function public.latest_verification_approved(p_owner_id uuid, p_vehicle_id uuid, p_document_type text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select d.status = 'approved'
      and (d.expires_on is null or d.expires_on >= (now() at time zone 'Asia/Kolkata')::date)
    from public.verification_documents d
    where d.owner_id = p_owner_id
      and d.vehicle_id is not distinct from p_vehicle_id
      and d.document_type = p_document_type
    order by d.created_at desc, d.id desc limit 1
  ), false)
$$;
revoke all on function public.latest_verification_approved(uuid, uuid, text) from public, anon;
grant execute on function public.latest_verification_approved(uuid, uuid, text) to authenticated;

create or replace function public.driver_documents_approved(p_owner_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.latest_verification_approved(p_owner_id, null, 'aadhaar')
    and public.latest_verification_approved(p_owner_id, null, 'selfie')
$$;
revoke all on function public.driver_documents_approved(uuid) from public, anon;
grant execute on function public.driver_documents_approved(uuid) to authenticated;

create or replace function public.vehicle_documents_approved(p_vehicle_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vehicles v where v.id = p_vehicle_id)
    and public.latest_verification_approved((select v.owner_id from public.vehicles v where v.id = p_vehicle_id), p_vehicle_id, 'registration')
    and exists (
      select 1 from public.vehicles v
      join lateral (
        select d.created_at from public.verification_documents d
        where d.owner_id = v.owner_id and d.vehicle_id = v.id and d.document_type = 'registration'
        order by d.created_at desc, d.id desc limit 1
      ) latest_registration on true
      where v.id = p_vehicle_id and latest_registration.created_at >= v.registration_updated_at
    )
    and public.latest_verification_approved((select v.owner_id from public.vehicles v where v.id = p_vehicle_id), p_vehicle_id, 'insurance')
    and public.latest_verification_approved((select v.owner_id from public.vehicles v where v.id = p_vehicle_id), p_vehicle_id, 'pollution')
$$;
revoke all on function public.vehicle_documents_approved(uuid) from public, anon;
grant execute on function public.vehicle_documents_approved(uuid) to authenticated;

create or replace function public.protect_verification_document() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and not public.is_admin() then
    raise exception 'Only an administrator can review verification documents.';
  end if;
  if tg_op = 'INSERT' and new.status <> 'pending' then
    raise exception 'New verification documents must be pending review.';
  end if;
  if tg_op = 'UPDATE' and new.storage_path is distinct from old.storage_path then
    raise exception 'Uploaded verification files cannot be replaced in place.';
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.reviewed_at := now();
    new.reviewed_by := (select auth.uid());
    if new.status = 'rejected' and length(btrim(coalesce(new.rejection_reason, ''))) = 0 then
      raise exception 'A reason is required when rejecting a document.';
    end if;
  end if;
  return new;
end;
$$;
create trigger protect_verification_document_fields before insert or update on public.verification_documents
  for each row execute procedure public.protect_verification_document();

create or replace function public.reset_verification_approval() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
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
create trigger reset_approval_after_verification_change after insert or update of status on public.verification_documents
  for each row execute procedure public.reset_verification_approval();

create or replace function public.protect_profile_privileges() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.is_blocked is distinct from old.is_blocked)
     and not public.is_admin() then
    raise exception 'Only an administrator can change account role, review, or block status.';
  end if;
  if new.owner_review_status is distinct from old.owner_review_status and not (
    public.is_admin() or (new.owner_review_status = 'pending' and old.role = 'owner' and old.id = (select auth.uid()))
  ) then raise exception 'Only an administrator can approve or reject a driver.'; end if;
  if new.owner_review_status = 'approved' and not public.driver_documents_approved(new.id) then
    raise exception 'Approve the latest Aadhaar and selfie documents before approving this driver.';
  end if;
  if old.role = 'owner' and (
    new.owner_review_status is distinct from 'approved'::public.review_status
    or (new.is_blocked and not old.is_blocked)
  ) then
    update public.vehicles set review_status = 'pending', is_available = false
      where owner_id = new.id and (review_status <> 'pending' or is_available);
  end if;
  return new;
end;
$$;

create or replace function public.protect_vehicle_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and not public.is_admin() then
    if new.review_status is distinct from old.review_status
       and not (new.review_status = 'pending' and old.owner_id = (select auth.uid())) then
      raise exception 'Only an administrator can change vehicle review status.';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.registration_number is distinct from old.registration_number then
    new.registration_updated_at := now();
    new.review_status := 'pending';
    new.is_available := false;
  elsif tg_op = 'UPDATE' and new.registration_updated_at is distinct from old.registration_updated_at then
    new.registration_updated_at := old.registration_updated_at;
  end if;
  if new.review_status = 'approved' and length(btrim(new.registration_number)) < 4 then
    raise exception 'A valid vehicle registration number is required before approval.';
  end if;
  if new.review_status = 'approved' and not public.driver_documents_approved(new.owner_id) then
    raise exception 'Approve the driver Aadhaar and selfie documents before approving this vehicle.';
  end if;
  if new.review_status = 'approved' and not public.vehicle_documents_approved(new.id) then
    raise exception 'Approve the latest registration, insurance, and pollution documents before approving this vehicle.';
  end if;
  if new.review_status = 'approved' and not exists (
    select 1 from public.profiles p where p.id = new.owner_id and p.owner_review_status = 'approved' and not p.is_blocked
  ) then
    raise exception 'Approve the owner before approving their vehicle.';
  end if;
  if new.is_available and (new.review_status <> 'approved'
    or not public.driver_documents_approved(new.owner_id)
    or not public.vehicle_documents_approved(new.id)
    or not exists (select 1 from public.profiles p where p.id = new.owner_id and p.owner_review_status = 'approved' and not p.is_blocked)) then
    if tg_op = 'UPDATE' and old.is_available then
      new.is_available := false;
    else
      raise exception 'Only approved owners and vehicles with current documents can be marked available.';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.is_blocked is distinct from old.is_blocked and not public.is_admin() then
    raise exception 'Only an administrator can block or unblock a vehicle.';
  end if;
  if new.availability_start is distinct from old.availability_start
     or new.availability_end is distinct from old.availability_end
     or new.is_available is distinct from old.is_available then
    new.availability_updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.is_approved_vehicle(p_vehicle_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.vehicles v
    join public.profiles owner_profile on owner_profile.id = v.owner_id
    where v.id = p_vehicle_id and v.is_available and not v.is_blocked
      and v.review_status = 'approved' and owner_profile.owner_review_status = 'approved'
      and not owner_profile.is_blocked
      and public.driver_documents_approved(v.owner_id)
      and public.vehicle_documents_approved(v.id)
  )
$$;
revoke all on function public.is_approved_vehicle(uuid) from public, anon;
grant execute on function public.is_approved_vehicle(uuid) to authenticated;

create or replace function public.check_booking_slot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.pickup_at <= now() then raise exception 'Choose a future pickup time.'; end if;
  if not public.is_approved_vehicle(new.vehicle_id) then
    raise exception 'This cab is not approved and available for booking.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.vehicle_id::text, 0));
  if exists (
    select 1 from public.bookings b where b.vehicle_id = new.vehicle_id and b.id is distinct from new.id
      and (b.status = 'accepted' or (b.status = 'pending' and b.expires_at > now()))
      and pg_catalog.tstzrange(b.pickup_at, b.pickup_at + b.duration_hours * interval '1 hour', '[)')
        && pg_catalog.tstzrange(new.pickup_at, new.pickup_at + new.duration_hours * interval '1 hour', '[)')
  ) then raise exception 'This cab already has a booking around that time.'; end if;
  return new;
end;
$$;

create or replace view public.available_vehicles with (security_invoker = false) as
  select v.id, v.owner_id, p.full_name as owner_name, v.name, v.vehicle_type,
         v.seats, v.hourly_rate, v.full_day_rate, v.per_km_rate,
         v.is_available, v.latitude, v.longitude, v.availability_start,
         v.availability_end, v.availability_updated_at
  from public.vehicles v join public.profiles p on p.id = v.owner_id
  where v.is_available and not v.is_blocked and v.review_status = 'approved'
    and p.role = 'owner' and p.owner_review_status = 'approved' and not p.is_blocked
    and public.driver_documents_approved(v.owner_id) and public.vehicle_documents_approved(v.id)
    and exists (select 1 from public.profiles me where me.id = (select auth.uid()) and not me.is_blocked and me.role in ('customer', 'admin'));
grant select on public.available_vehicles to authenticated;
