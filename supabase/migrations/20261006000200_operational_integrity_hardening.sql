-- Operational integrity hardening:
-- 1. Enforce unique normalized vehicle registration (Fix P0-2)
-- 2. Server-side availability hours enforcement in check_booking_slot (Fix P0-3)
-- 3. Acceptance-time vehicle eligibility re-check (Fix P0-4)
-- 4. Support account_closed booking reason

-- 1. Unique normalized registration number to prevent double-booking one physical cab
create unique index if not exists vehicles_normalized_registration_idx
  on public.vehicles (upper(regexp_replace(registration_number, '\s+', '', 'g')))
  where registration_number <> '';

-- 2. Enforce declared operating hours in check_booking_slot
create or replace function public.check_booking_slot() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_vehicle record;
  v_start_time time;
  v_end_time time;
  v_pickup_local timestamptz;
  v_dropoff_local timestamptz;
begin
  if new.pickup_at <= now() then
    raise exception 'Choose a future pickup time.';
  end if;

  if not public.is_approved_vehicle(new.vehicle_id) then
    raise exception 'This cab is not approved and available for booking.';
  end if;

  select availability_start, availability_end into v_vehicle
  from public.vehicles where id = new.vehicle_id;

  if v_vehicle.availability_start is not null and v_vehicle.availability_end is not null then
    v_pickup_local := new.pickup_at at time zone 'Asia/Kolkata';
    v_dropoff_local := (new.pickup_at + new.duration_hours * interval '1 hour') at time zone 'Asia/Kolkata';

    if v_pickup_local::date <> v_dropoff_local::date then
      raise exception 'Overnight bookings across availability windows are not supported in the pilot.';
    end if;

    v_start_time := v_pickup_local::time;
    v_end_time := v_dropoff_local::time;

    if v_start_time < v_vehicle.availability_start or v_end_time > v_vehicle.availability_end then
      raise exception 'Requested booking is outside the cab declared working hours.';
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.vehicle_id::text, 0));
  if exists (
    select 1 from public.bookings b where b.vehicle_id = new.vehicle_id and b.id is distinct from new.id
      and (b.status = 'accepted' or (b.status = 'pending' and b.expires_at > now()))
      and pg_catalog.tstzrange(b.pickup_at, b.pickup_at + b.duration_hours * interval '1 hour', '[)')
        && pg_catalog.tstzrange(new.pickup_at, new.pickup_at + new.duration_hours * interval '1 hour', '[)')
  ) then
    raise exception 'This cab already has a booking around that time.';
  end if;

  return new;
end;
$$;

-- 3. Acceptance-time eligibility recheck and account_closed reason support in protect_booking_fields
create or replace function public.protect_booking_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin() or current_setting('app.account_closure', true) = 'on' then
    return new;
  end if;

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

  -- Recheck vehicle eligibility at acceptance time (Fix P0-4)
  if old.status = 'pending' and new.status = 'accepted' then
    if not public.is_approved_vehicle(new.vehicle_id) then
      raise exception 'Cannot accept booking: cab or driver is no longer approved and available.';
    end if;
  end if;

  if length(coalesce(new.status_reason, '')) > 500 then
    raise exception 'The booking reason must be 500 characters or fewer.';
  end if;

  if new.status in ('rejected', 'cancelled') and length(btrim(coalesce(new.status_reason, ''))) = 0 then
    raise exception 'Choose a reason when rejecting or cancelling a booking.';
  end if;

  if new.status_reason is not null and new.status_reason not in (
    'reasonPlansChanged', 'reasonBookedElsewhere', 'reasonWrongDetails',
    'schedule_conflict', 'cab_unavailable', 'driver_no_show', 'customer_no_show', 'system_expiry',
    'account_closed'
  ) and new.status is distinct from old.status then
    raise exception 'Choose a supported booking reason.';
  end if;

  if new.status_reason in ('driver_no_show', 'customer_no_show') and old.status = 'accepted' and old.pickup_at > now() then
    raise exception 'A no-show can only be reported after pickup time.';
  end if;

  return new;
end;
$$;
