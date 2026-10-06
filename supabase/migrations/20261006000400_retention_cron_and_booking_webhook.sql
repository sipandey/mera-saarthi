-- Migration: 20261006000400_retention_cron_and_booking_webhook.sql
-- Description: Sets up pg_net and pg_cron extensions, private config schema,
-- booking push notification webhook trigger, and daily retention purge cron job.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- 1. Private service configuration schema
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant all on schema private to service_role, postgres;

create table if not exists private.service_secrets (
  name text primary key,
  secret text not null,
  updated_at timestamptz not null default now()
);
revoke all on private.service_secrets from public, anon, authenticated;
grant all on private.service_secrets to service_role, postgres;

-- 2. Verification purge trigger function for pg_cron
create or replace function private.trigger_verification_purge()
returns bigint
language plpgsql
security definer
set search_path = private, extensions, public
as $$
declare
  v_base_url text;
  v_secret text;
  v_req_id bigint;
begin
  select secret into v_base_url from private.service_secrets where name = 'edge_function_base_url';
  select secret into v_secret from private.service_secrets where name = 'verification_retention_secret';

  if v_base_url is null or v_secret is null then
    return null;
  end if;

  select net.http_post(
    url := rtrim(v_base_url, '/') || '/purge-verification-files',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-verification-retention-secret', v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  ) into v_req_id;

  return v_req_id;
exception
  when others then
    return null;
end;
$$;

revoke all on function private.trigger_verification_purge() from public, anon, authenticated;
grant execute on function private.trigger_verification_purge() to service_role, postgres;

-- 3. Daily cron job for verification evidence purge
do $$
begin
  if exists (select 1 from cron.job where jobname = 'daily-verification-purge') then
    perform cron.unschedule('daily-verification-purge');
  end if;
  -- Schedule at 03:00 IST (21:30 UTC)
  perform cron.schedule(
    'daily-verification-purge',
    '30 21 * * *',
    'select private.trigger_verification_purge();'
  );
exception
  when others then
    raise notice 'Could not register cron job daily-verification-purge: %', sqlerrm;
end;
$$;

-- 4. Booking INSERT webhook trigger function
create or replace function private.handle_booking_inserted_push()
returns trigger
language plpgsql
security definer
set search_path = private, extensions, public
as $$
declare
  v_base_url text;
  v_secret text;
  v_payload jsonb;
begin
  -- Only trigger for newly requested pending bookings
  if new.status <> 'pending' then
    return new;
  end if;

  select secret into v_base_url from private.service_secrets where name = 'edge_function_base_url';
  select secret into v_secret from private.service_secrets where name = 'booking_push_webhook_secret';

  if v_base_url is null or v_secret is null then
    return new;
  end if;

  v_payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'bookings',
    'schema', 'public',
    'record', jsonb_build_object(
      'id', new.id,
      'vehicle_id', new.vehicle_id,
      'status', new.status,
      'customer_id', new.customer_id,
      'booking_date', new.booking_date,
      'slot_type', new.slot_type
    )
  );

  perform net.http_post(
    url := rtrim(v_base_url, '/') || '/send-booking-request',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-booking-webhook-secret', v_secret
    ),
    body := v_payload,
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    -- Push delivery is best-effort; failure must never fail the booking transaction
    return new;
end;
$$;

revoke all on function private.handle_booking_inserted_push() from public, anon, authenticated;
grant execute on function private.handle_booking_inserted_push() to service_role, postgres;

drop trigger if exists trg_booking_inserted_push on public.bookings;
create trigger trg_booking_inserted_push
  after insert on public.bookings
  for each row
  execute function private.handle_booking_inserted_push();
