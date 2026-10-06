-- Account closure, data anonymization, and foreign key relaxation.
-- Allows user accounts to be deleted cleanly while preserving operational booking history.

-- 1. Relax foreign key constraints on bookings so deleting a customer or vehicle sets the reference to null
alter table public.bookings alter column customer_id drop not null;
alter table public.bookings drop constraint if exists bookings_customer_id_fkey;
alter table public.bookings add constraint bookings_customer_id_fkey
  foreign key (customer_id) references public.profiles(id) on delete set null;

alter table public.bookings alter column vehicle_id drop not null;
alter table public.bookings drop constraint if exists bookings_vehicle_id_fkey;
alter table public.bookings add constraint bookings_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles(id) on delete set null;

-- 2. Audit table for account closure requests
create table public.account_closure_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.account_role not null,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  details text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz default now()
);

alter table public.account_closure_requests enable row level security;
revoke all on public.account_closure_requests from public, anon;

create policy "Users see own closure requests" on public.account_closure_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "Admins manage closure requests" on public.account_closure_requests
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.account_closure_requests to authenticated;

-- 3. Update protect_booking_fields to allow system anonymization during account closure
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
     or new.payment_method is distinct from old.payment_method
     or new.customer_name is distinct from old.customer_name
     or new.vehicle_name is distinct from old.vehicle_name
     or new.owner_name is distinct from old.owner_name then
    raise exception 'Booking details cannot be edited after the request is created.';
  end if;
  return new;
end;
$$;

-- 4. Atomic RPC for account closure & anonymization
create or replace function public.request_account_closure()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.account_role;
  v_request_id uuid := gen_random_uuid();
  v_vehicle record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_role from public.profiles where id = v_user_id;
  if not found then
    raise exception 'Profile not found';
  end if;

  -- Set session configuration for trigger bypass during anonymization
  perform set_config('app.account_closure', 'on', true);

  -- 1. If owner: disable vehicles, withdraw photos, and queue vehicle documents
  if v_role = 'owner' then
    for v_vehicle in select id from public.vehicles where owner_id = v_user_id loop
      perform public.enqueue_verification_purge_paths(null, v_vehicle.id, 'vehicle_deleted');
    end loop;

    update public.vehicles
      set is_available = false, review_status = 'rejected'
      where owner_id = v_user_id;

    update public.profiles
      set show_driver_photo = false
      where id = v_user_id;
  end if;

  -- 2. Cancel open pending bookings involving this user
  update public.bookings
    set status = 'cancelled', status_reason = 'account_closed'
    where (customer_id = v_user_id or vehicle_id in (select id from public.vehicles where owner_id = v_user_id))
      and status = 'pending';

  -- 3. Queue owner identity documents if applicable
  perform public.enqueue_verification_purge_paths(v_user_id, null, 'account_deleted');

  -- 4. Anonymize personal details in retained booking records
  update public.bookings
    set customer_name = 'Deleted Customer',
        pickup_location = 'Anonymized',
        destination = 'Anonymized'
    where customer_id = v_user_id;

  if v_role = 'owner' then
    update public.bookings
      set owner_name = 'Deleted Owner'
      where vehicle_id in (select id from public.vehicles where owner_id = v_user_id);
  end if;

  -- 5. Delete push tokens
  delete from public.push_tokens where owner_id = v_user_id;

  -- 6. Audit record
  insert into public.account_closure_requests (id, user_id, role, status, completed_at)
  values (v_request_id, v_user_id, v_role, 'completed', now());

  -- 7. Delete profile
  delete from public.profiles where id = v_user_id;

  return jsonb_build_object('success', true, 'request_id', v_request_id);
end;
$$;

revoke all on function public.request_account_closure() from public, anon;
grant execute on function public.request_account_closure() to authenticated;
