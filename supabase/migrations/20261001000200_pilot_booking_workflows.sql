-- Owner/vehicle approval, booking lifecycle, availability windows, and
-- privacy-limited pilot events. Apply after the initial schema and the
-- booking_status enum migration.

create type public.review_status as enum ('pending', 'approved', 'rejected');

alter table public.profiles
  add column owner_review_status public.review_status;

-- Fail closed: accounts that existed before review was introduced must be
-- explicitly approved by an administrator before they can receive bookings.
update public.profiles
set owner_review_status = case when role = 'owner' then 'pending'::public.review_status else null end;
alter table public.profiles
  add constraint profiles_owner_review_status_role check (
    (role = 'owner' and owner_review_status is not null)
    or (role <> 'owner' and owner_review_status is null)
  );

alter table public.vehicles
  add column registration_number text not null default '',
  add column review_status public.review_status not null default 'pending',
  add column is_blocked boolean not null default false,
  add column availability_start time,
  add column availability_end time,
  add column availability_updated_at timestamptz not null default now(),
  add constraint vehicles_availability_window_pair check ((availability_start is null) = (availability_end is null)),
  add constraint vehicles_availability_window_order check (availability_start is null or availability_start < availability_end);

-- Existing vehicles also require review. Do not leave old listings live.
update public.vehicles
set is_available = false, review_status = 'pending', availability_updated_at = now();

alter table public.bookings
  add column expires_at timestamptz not null default (now() + interval '15 minutes'),
  add column per_km_rate_snapshot numeric(10,2) not null default 0 check (per_km_rate_snapshot >= 0),
  add column status_reason text,
  add column request_key uuid not null default gen_random_uuid(),
  add constraint bookings_request_key_unique unique (request_key);

update public.bookings b
set expires_at = b.created_at + interval '15 minutes',
    per_km_rate_snapshot = coalesce(v.per_km_rate, 0)
from public.vehicles v
where v.id = b.vehicle_id;

create index bookings_expiry_idx on public.bookings (expires_at) where status = 'pending';
create index vehicles_review_search_idx on public.vehicles (review_status, is_available, vehicle_type);

create table public.booking_status_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  changed_at timestamptz not null default now()
);

create index booking_status_history_booking_idx on public.booking_status_history (booking_id, changed_at);
alter table public.booking_status_history enable row level security;
revoke all on table public.booking_status_history from anon, authenticated;
grant select on table public.booking_status_history to authenticated;
create policy "Booking parties and admins read status history" on public.booking_status_history
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      left join public.vehicles v on v.id = b.vehicle_id
      where b.id = booking_id
        and (b.customer_id = (select auth.uid()) or v.owner_id = (select auth.uid()))
    )
  );

insert into public.booking_status_history (booking_id, from_status, to_status, actor_id, reason, changed_at)
select id, null, status, null, 'Imported from the booking status at rollout.', created_at
from public.bookings;

create table public.pilot_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in ('search', 'results_view', 'booking_request', 'booking_accepted', 'booking_rejected', 'booking_expired', 'booking_cancelled', 'booking_completed')),
  booking_id uuid references public.bookings(id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index pilot_events_time_idx on public.pilot_events (occurred_at, event_name);
alter table public.pilot_events enable row level security;
revoke all on table public.pilot_events from anon, authenticated;

create table public.push_tokens (
  expo_push_token text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now()
);
create index push_tokens_owner_idx on public.push_tokens (owner_id);
alter table public.push_tokens enable row level security;
revoke all on table public.push_tokens from anon;
grant select, insert, update, delete on table public.push_tokens to authenticated;
create policy "Owners manage their own push tokens" on public.push_tokens for all to authenticated
  using (
    owner_id = (select auth.uid()) and public.is_active_user()
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner')
  )
  with check (
    owner_id = (select auth.uid()) and public.is_active_user()
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner')
  );

create or replace function public.record_booking_status_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_status_history (booking_id, from_status, to_status, actor_id, reason)
    values (new.id, null, new.status, case when new.status_reason = 'system_expiry' then null else (select auth.uid()) end, new.status_reason);
  elsif new.status is distinct from old.status then
    insert into public.booking_status_history (booking_id, from_status, to_status, actor_id, reason)
    values (new.id, old.status, new.status, case when new.status_reason = 'system_expiry' then null else (select auth.uid()) end, new.status_reason);
  else
    return new;
  end if;

  if new.status = 'accepted' then
    insert into public.pilot_events (event_name, booking_id) values ('booking_accepted', new.id);
  elsif new.status = 'rejected' then
    insert into public.pilot_events (event_name, booking_id) values ('booking_rejected', new.id);
  elsif new.status = 'expired' then
    insert into public.pilot_events (event_name, booking_id) values ('booking_expired', new.id);
  elsif new.status = 'cancelled' then
    insert into public.pilot_events (event_name, booking_id) values ('booking_cancelled', new.id);
  elsif new.status = 'completed' then
    insert into public.pilot_events (event_name, booking_id) values ('booking_completed', new.id);
  elsif new.status = 'pending' then
    insert into public.pilot_events (event_name, booking_id) values ('booking_request', new.id);
  end if;
  return new;
end;
$$;
create trigger booking_status_history_after_change
  after insert or update of status on public.bookings
  for each row execute procedure public.record_booking_status_history();

create or replace function public.snapshot_booking_details() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  hourly numeric(10,2);
  full_day numeric(10,2);
begin
  select v.name, p.full_name, v.per_km_rate, v.hourly_rate, v.full_day_rate
    into new.vehicle_name, new.owner_name, new.per_km_rate_snapshot, hourly, full_day
  from public.vehicles v
  join public.profiles p on p.id = v.owner_id
  where v.id = new.vehicle_id;
  if new.ride_type = 'local' then
    new.estimated_fare := case when new.duration_hours >= 8 then full_day else hourly * new.duration_hours end;
  else
    new.estimated_fare := 0;
  end if;
  new.estimated_km := 0;
  new.status_reason := null;
  new.created_at := now();
  new.expires_at := now() + interval '15 minutes';
  return new;
end;
$$;

create or replace function public.check_booking_slot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.pickup_at <= now() then
    raise exception 'Choose a future pickup time.';
  end if;
  if not exists (
    select 1 from public.vehicles v
    join public.profiles p on p.id = v.owner_id
    where v.id = new.vehicle_id and v.is_available
      and v.review_status = 'approved' and not v.is_blocked and p.owner_review_status = 'approved'
      and not p.is_blocked
  ) then
    raise exception 'This cab is not approved and available for booking.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.vehicle_id::text, 0));
  if exists (
    select 1 from public.bookings b
    where b.vehicle_id = new.vehicle_id
      and b.id is distinct from new.id
      and (b.status = 'accepted' or (b.status = 'pending' and b.expires_at > now()))
      and pg_catalog.tstzrange(b.pickup_at, b.pickup_at + b.duration_hours * interval '1 hour', '[)')
          && pg_catalog.tstzrange(new.pickup_at, new.pickup_at + new.duration_hours * interval '1 hour', '[)')
  ) then
    raise exception 'This cab already has a booking around that time.';
  end if;
  return new;
end;
$$;

create or replace function public.protect_booking_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin() then return new; end if;
  if new.customer_id is distinct from old.customer_id
     or new.vehicle_id is distinct from old.vehicle_id
     or new.ride_type is distinct from old.ride_type
     or new.vehicle_type is distinct from old.vehicle_type
     or new.pickup_at is distinct from old.pickup_at
     or new.pickup_location is distinct from old.pickup_location
     or new.duration_hours is distinct from old.duration_hours
     or new.destination is distinct from old.destination
     or new.estimated_km is distinct from old.estimated_km
     or new.estimated_fare is distinct from old.estimated_fare
     or new.per_km_rate_snapshot is distinct from old.per_km_rate_snapshot
     or new.request_key is distinct from old.request_key
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at
     or new.payment_method is distinct from old.payment_method
     or new.customer_name is distinct from old.customer_name
     or new.vehicle_name is distinct from old.vehicle_name
     or new.owner_name is distinct from old.owner_name then
    raise exception 'Booking details cannot be edited after the request is created.';
  end if;
  if new.status is not distinct from old.status and new.status_reason is distinct from old.status_reason then
    raise exception 'A reason can only be recorded when the booking status changes.';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'pending' and new.status in ('accepted', 'rejected', 'cancelled', 'expired'))
    or (old.status = 'accepted' and new.status in ('cancelled', 'completed'))
  ) then
    raise exception 'This booking status change is not allowed.';
  end if;
  if length(coalesce(new.status_reason, '')) > 500 then
    raise exception 'The booking reason must be 500 characters or fewer.';
  end if;
  if new.status in ('rejected', 'cancelled') and length(btrim(coalesce(new.status_reason, ''))) = 0 then
    raise exception 'Choose a reason when rejecting or cancelling a booking.';
  end if;
  if new.status_reason is not null and new.status_reason not in (
    'reasonPlansChanged', 'reasonBookedElsewhere', 'reasonWrongDetails',
    'schedule_conflict', 'cab_unavailable', 'driver_no_show', 'customer_no_show', 'system_expiry'
  ) and new.status is distinct from old.status then
    raise exception 'Choose a supported booking reason.';
  end if;
  if new.status_reason in ('driver_no_show', 'customer_no_show') and old.status = 'accepted' and old.pickup_at > now() then
    raise exception 'A no-show can only be reported after pickup time.';
  end if;
  return new;
end;
$$;

create or replace function public.protect_profile_privileges() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.is_blocked is distinct from old.is_blocked
      or new.owner_review_status is distinct from old.owner_review_status)
     and not public.is_admin() then
    raise exception 'Only an administrator can change account role, review, or block status.';
  end if;
  if old.role = 'owner' and (
    new.owner_review_status is distinct from 'approved'::public.review_status
    or (new.is_blocked and not old.is_blocked)
  ) then
    update public.vehicles
      set review_status = 'pending', is_available = false
      where owner_id = new.id and (review_status <> 'pending' or is_available);
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, phone, owner_review_status)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'owner' then 'owner'::public.account_role else 'customer'::public.account_role end,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'role' = 'owner' then 'pending'::public.review_status else null end
  );
  return new;
end;
$$;

create or replace function public.protect_vehicle_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and not public.is_admin() then
    if new.review_status is distinct from old.review_status then
      raise exception 'Only an administrator can change vehicle review status.';
    end if;
    if new.registration_number is distinct from old.registration_number and old.review_status = 'approved' then
      new.review_status := 'pending';
      new.is_available := false;
    end if;
  end if;
  if new.review_status = 'approved' and length(btrim(new.registration_number)) < 4 then
    raise exception 'A valid vehicle registration number is required before approval.';
  end if;
  if new.review_status = 'approved' and not exists (
    select 1 from public.profiles p where p.id = new.owner_id and p.owner_review_status = 'approved' and not p.is_blocked
  ) then
    raise exception 'Approve the owner before approving their vehicle.';
  end if;
  if new.is_available and (new.review_status <> 'approved' or not exists (
    select 1 from public.profiles p where p.id = new.owner_id and p.owner_review_status = 'approved' and not p.is_blocked
  )) then
    raise exception 'Only approved owners and vehicles can be marked available.';
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
create trigger protect_vehicle_review_fields before insert or update on public.vehicles
  for each row execute procedure public.protect_vehicle_review();

create or replace function public.expire_stale_bookings() returns integer
language plpgsql security definer set search_path = '' as $$
declare expired_count integer;
begin
  if (select auth.uid()) is not null and not public.is_active_user() then
    raise exception 'An active account is required.';
  end if;
  update public.bookings
  set status = 'expired', status_reason = 'system_expiry'
  where status = 'pending' and expires_at <= now();
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;
revoke all on function public.expire_stale_bookings() from public, anon;
grant execute on function public.expire_stale_bookings() to authenticated, service_role;

create or replace function public.record_pilot_event(p_event_name text, p_booking_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_user() then raise exception 'An active account is required.'; end if;
  if p_event_name not in ('search', 'results_view') then raise exception 'Unsupported pilot event.'; end if;
  if p_booking_id is not null and not exists (
    select 1 from public.bookings b
    where b.id = p_booking_id and (
      b.customer_id = (select auth.uid())
      or exists (select 1 from public.vehicles v where v.id = b.vehicle_id and v.owner_id = (select auth.uid()))
      or public.is_admin()
    )
  ) then raise exception 'Booking not found.'; end if;
  insert into public.pilot_events (event_name, booking_id) values (p_event_name, p_booking_id);
end;
$$;
revoke all on function public.record_pilot_event(text, uuid) from public, anon;
grant execute on function public.record_pilot_event(text, uuid) to authenticated;

create or replace function public.get_weekly_pilot_metrics()
returns table (week_start date, event_name text, event_count bigint)
language sql stable security definer set search_path = '' as $$
  select date_trunc('week', e.occurred_at)::date, e.event_name, count(*)
  from public.pilot_events e
  where public.is_admin() and e.occurred_at >= now() - interval '12 weeks'
  group by 1, 2 order by 1 desc, 2
$$;
revoke all on function public.get_weekly_pilot_metrics() from public, anon;
grant execute on function public.get_weekly_pilot_metrics() to authenticated;

create or replace function public.is_approved_vehicle(p_vehicle_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.vehicles v
    join public.profiles owner_profile on owner_profile.id = v.owner_id
    where v.id = p_vehicle_id and v.is_available and not v.is_blocked
      and v.review_status = 'approved' and owner_profile.owner_review_status = 'approved'
      and not owner_profile.is_blocked
  )
$$;
revoke all on function public.is_approved_vehicle(uuid) from public, anon;
grant execute on function public.is_approved_vehicle(uuid) to authenticated;

create or replace view public.available_vehicles with (security_invoker = false) as
  select v.id, v.owner_id, p.full_name as owner_name, v.name, v.vehicle_type,
         v.seats, v.hourly_rate, v.full_day_rate, v.per_km_rate,
         v.is_available, v.latitude, v.longitude, v.availability_start,
         v.availability_end, v.availability_updated_at
  from public.vehicles v
  join public.profiles p on p.id = v.owner_id
  where v.is_available and not v.is_blocked and v.review_status = 'approved'
    and p.role = 'owner' and p.owner_review_status = 'approved' and not p.is_blocked
    and exists (
      select 1 from public.profiles me where me.id = (select auth.uid())
        and not me.is_blocked and me.role in ('customer', 'admin')
    );
grant select on public.available_vehicles to authenticated;

drop policy if exists "Owners add vehicles" on public.vehicles;
create policy "Owners submit vehicles for review" on public.vehicles for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and public.is_active_user()
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner')
    and review_status = 'pending' and not is_available and not is_blocked and length(btrim(registration_number)) >= 4
  );

drop policy if exists "Owners update own vehicles" on public.vehicles;
create policy "Owners update own vehicles" on public.vehicles for update to authenticated
  using (owner_id = (select auth.uid()) and public.is_active_user())
  with check (owner_id = (select auth.uid()) and public.is_active_user());

drop policy if exists "Customers request bookings" on public.bookings;
create policy "Customers request approved vehicles" on public.bookings for insert to authenticated
  with check (
    customer_id = (select auth.uid()) and public.is_active_user()
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'customer')
    and status = 'pending' and payment_method = 'cash'
    and public.is_approved_vehicle(vehicle_id)
  );

drop policy if exists "Owners accept or reject requests for their vehicles" on public.bookings;
create policy "Owners manage requests for their vehicles" on public.bookings for update to authenticated
  using (
    status in ('pending', 'accepted') and public.is_active_user()
    and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid()))
  )
  with check (status in ('accepted', 'rejected', 'cancelled', 'completed'));

drop policy if exists "Customers cancel own pending or accepted bookings" on public.bookings;
create policy "Customers cancel own pending or accepted bookings" on public.bookings for update to authenticated
  using (customer_id = (select auth.uid()) and status in ('pending', 'accepted') and public.is_active_user())
  with check (customer_id = (select auth.uid()) and status = 'cancelled');

-- The SECURITY DEFINER view is deliberately allowlisted: it exposes only
-- non-contact fields for approved, available vehicles to active customers/admins.
revoke all on table public.pilot_events from anon, authenticated;
