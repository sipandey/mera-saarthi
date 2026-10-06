-- Run once in Supabase SQL Editor. Auth user metadata role accepts only
-- "customer" or "owner"; admin access must be granted by an existing admin.
create extension if not exists pgcrypto;

create type public.account_role as enum ('customer', 'owner', 'admin');
create type public.ride_type as enum ('local', 'outstation');
create type public.booking_status as enum ('pending', 'accepted', 'rejected', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.account_role not null default 'customer',
  full_name text not null default '',
  phone text not null default '',
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'owner' then 'owner'::public.account_role else 'customer'::public.account_role end,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  vehicle_type text not null check (vehicle_type in ('Hatchback', 'Sedan', 'SUV', 'Van')),
  seats integer not null check (seats between 1 and 20),
  hourly_rate numeric(10,2) not null default 0 check (hourly_rate >= 0),
  full_day_rate numeric(10,2) not null default 0 check (full_day_rate >= 0),
  per_km_rate numeric(10,2) not null default 0 check (per_km_rate >= 0),
  is_available boolean not null default true,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

-- Public listing exposes only active owner names and available cars, never phone numbers.
create view public.available_vehicles with (security_invoker = false) as
  select v.id, v.owner_id, p.full_name as owner_name, v.name, v.vehicle_type,
         v.seats, v.hourly_rate, v.full_day_rate, v.per_km_rate,
         v.is_available, v.latitude, v.longitude
  from public.vehicles v
  join public.profiles p on p.id = v.owner_id
  where v.is_available and p.role = 'owner' and not p.is_blocked
    and exists (select 1 from public.profiles me where me.id = (select auth.uid()) and not me.is_blocked and me.role in ('customer', 'admin'));
grant select on public.available_vehicles to authenticated;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  vehicle_id uuid not null references public.vehicles(id),
  ride_type public.ride_type not null,
  vehicle_type text not null,
  pickup_at timestamptz not null,
  pickup_location text not null default 'Main Market',
  duration_hours numeric(5,2) not null default 1 check (duration_hours > 0),
  destination text not null default '',
  estimated_km numeric(8,2) not null default 0 check (estimated_km >= 0),
  estimated_fare numeric(10,2) not null check (estimated_fare >= 0),
  customer_name text not null default '',
  vehicle_name text not null default '',
  owner_name text not null default '',
  payment_method text not null default 'cash' check (payment_method = 'cash'),
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now()
);

create function public.snapshot_booking_details() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select v.name, p.full_name into new.vehicle_name, new.owner_name
  from public.vehicles v join public.profiles p on p.id = v.owner_id
  where v.id = new.vehicle_id;
  return new;
end;
$$;
create trigger booking_details_snapshot before insert on public.bookings
for each row execute procedure public.snapshot_booking_details();

-- Serialize requests per vehicle so two customers cannot claim the same time slot.
create function public.check_booking_slot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.pickup_at <= now() then
    raise exception 'Choose a future pickup time.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.vehicle_id::text, 0));
  if exists (
    select 1 from public.bookings b
    where b.vehicle_id = new.vehicle_id
      and b.id is distinct from new.id
      and b.status in ('pending', 'accepted')
      and pg_catalog.tstzrange(b.pickup_at, b.pickup_at + b.duration_hours * interval '1 hour', '[)')
          && pg_catalog.tstzrange(new.pickup_at, new.pickup_at + new.duration_hours * interval '1 hour', '[)')
  ) then
    raise exception 'This cab already has a booking around that time.';
  end if;
  return new;
end;
$$;
create trigger booking_slot_check before insert or update of vehicle_id, pickup_at, duration_hours on public.bookings
for each row execute procedure public.check_booking_slot();

create function public.protect_booking_fields() returns trigger
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
     or new.payment_method is distinct from old.payment_method
     or new.customer_name is distinct from old.customer_name
     or new.vehicle_name is distinct from old.vehicle_name
     or new.owner_name is distinct from old.owner_name then
    raise exception 'Booking details cannot be edited after the request is created.';
  end if;
  return new;
end;
$$;
create trigger protect_booking_fields before update on public.bookings
for each row execute procedure public.protect_booking_fields();

create index vehicles_search_idx on public.vehicles (vehicle_type, is_available);
create index bookings_customer_idx on public.bookings (customer_id, pickup_at desc);
create index bookings_vehicle_idx on public.bookings (vehicle_id, pickup_at);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin' and not is_blocked)
$$;
create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and not is_blocked)
$$;

create function public.protect_profile_privileges() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.is_blocked is distinct from old.is_blocked)
     and not public.is_admin() then
    raise exception 'Only an administrator can change account roles or block status.';
  end if;
  return new;
end;
$$;
create trigger protect_profile_privileges before update on public.profiles
for each row execute procedure public.protect_profile_privileges();

-- Driver contact is returned only after an accepted booking and only to its customer.
create function public.get_booking_driver_contact(p_booking_id uuid)
returns table (full_name text, phone text)
language sql stable security definer set search_path = '' as $$
  select p.full_name, p.phone
  from public.bookings b
  join public.vehicles v on v.id = b.vehicle_id
  join public.profiles p on p.id = v.owner_id
  where b.id = p_booking_id and b.customer_id = (select auth.uid()) and b.status = 'accepted' and public.is_active_user()
$$;
revoke all on function public.get_booking_driver_contact(uuid) from public, anon;
grant execute on function public.get_booking_driver_contact(uuid) to authenticated;

-- Customer contact is returned only for an accepted ride and to that vehicle's owner.
create function public.get_booking_customer_contact(p_booking_id uuid)
returns table (full_name text, phone text)
language sql stable security definer set search_path = '' as $$
  select p.full_name, p.phone
  from public.bookings b
  join public.vehicles v on v.id = b.vehicle_id
  join public.profiles p on p.id = b.customer_id
  where b.id = p_booking_id and v.owner_id = (select auth.uid()) and b.status = 'accepted' and public.is_active_user()
$$;
revoke all on function public.get_booking_customer_contact(uuid) from public, anon;
grant execute on function public.get_booking_customer_contact(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.bookings enable row level security;

create policy "Profiles visible to self and admins" on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());
create policy "Users update own contact details" on public.profiles for update to authenticated
using (id = (select auth.uid()) and role <> 'admin' and not is_blocked)
with check (id = (select auth.uid()) and role <> 'admin');
create policy "Admins manage profiles" on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Active users browse available vehicles" on public.vehicles for select to authenticated
using (public.is_admin() or (public.is_active_user() and (is_available or owner_id = (select auth.uid()))));
create policy "Owners add vehicles" on public.vehicles for insert to authenticated
with check (owner_id = (select auth.uid()) and public.is_active_user() and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner'));
create policy "Owners update own vehicles" on public.vehicles for update to authenticated
using (owner_id = (select auth.uid()) and public.is_active_user())
with check (owner_id = (select auth.uid()) and public.is_active_user());
create policy "Admins manage vehicles" on public.vehicles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Customers read own and owners read their requests" on public.bookings for select to authenticated
using (public.is_admin() or (public.is_active_user() and (customer_id = (select auth.uid()) or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())))));
create policy "Customers request bookings" on public.bookings for insert to authenticated
with check (customer_id = (select auth.uid()) and public.is_active_user() and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'customer') and status = 'pending' and payment_method = 'cash' and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.is_available));
create policy "Customers cancel own pending or accepted bookings" on public.bookings for update to authenticated
using (customer_id = (select auth.uid()) and status in ('pending', 'accepted') and public.is_active_user())
with check (customer_id = (select auth.uid()) and status = 'cancelled');
create policy "Owners accept or reject requests for their vehicles" on public.bookings for update to authenticated
using (status = 'pending' and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())) and public.is_active_user())
with check (status in ('accepted', 'rejected'));
create policy "Admins manage bookings" on public.bookings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Table privileges allow requests to reach Postgres; the RLS policies above
-- still decide which rows and operations each signed-in user can access.
revoke all on table public.profiles, public.vehicles, public.bookings, public.available_vehicles from anon;
grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.vehicles to authenticated;
grant select, insert, update on table public.bookings to authenticated;
grant select on table public.available_vehicles to authenticated;
