-- Purge raw private evidence after its operational review purpose ends while
-- retaining the minimum review metadata needed for current eligibility.

alter table public.verification_documents add column purged_at timestamptz;
alter table public.verification_documents add column display_withdrawn_at timestamptz;
alter table public.verification_documents alter column storage_path drop not null;
alter table public.verification_documents
  add constraint verification_document_purge_path_check check (
    (purged_at is null and storage_path is not null)
    or (purged_at is not null and storage_path is null)
  );
alter table public.profiles
  add column show_driver_photo_updated_at timestamptz not null default now();

create table public.verification_storage_purge_queue (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  storage_path text not null,
  reason text not null check (reason in (
    'approved_reviewed', 'rejected', 'superseded', 'expired',
    'driver_consent_withdrawn', 'display_photo_withdrawn', 'account_deleted', 'vehicle_deleted'
  )),
  queued_at timestamptz not null default now(),
  claimed_at timestamptz,
  attempts integer not null default 0,
  last_error_code text,
  unique (storage_path)
);
alter table public.verification_storage_purge_queue enable row level security;
revoke all on public.verification_storage_purge_queue from public, anon, authenticated;
grant select, insert, update, delete on public.verification_storage_purge_queue to service_role;

create or replace function public.track_driver_photo_consent_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.show_driver_photo is distinct from old.show_driver_photo then
    new.show_driver_photo_updated_at := now();
    if new.show_driver_photo and not exists (
      select 1 from public.verification_documents d
      where d.owner_id = new.id and d.vehicle_id is null
        and d.document_type = 'selfie' and d.status = 'approved' and d.purged_at is null
        and not exists (select 1 from public.verification_storage_purge_queue q where q.document_id = d.id)
        and not exists (
          select 1 from public.verification_documents newer
          where newer.owner_id = d.owner_id and newer.vehicle_id is null
            and newer.document_type = 'selfie'
            and (newer.created_at > d.created_at or (newer.created_at = d.created_at and newer.id > d.id))
        )
    ) then
      raise exception 'Upload and receive approval for a current selfie before displaying it.';
    end if;
  else
    new.show_driver_photo_updated_at := old.show_driver_photo_updated_at;
  end if;
  return new;
end;
$$;
create trigger track_driver_photo_consent
  before update of show_driver_photo on public.profiles
  for each row execute procedure public.track_driver_photo_consent_change();

create or replace function public.protect_verification_document()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and auth.role() = 'service_role' then
    if (new.id, new.owner_id, new.vehicle_id, new.document_type, new.status, new.expires_on,
        new.created_at, new.display_withdrawn_at)
       is distinct from
       (old.id, old.owner_id, old.vehicle_id, old.document_type, old.status, old.expires_on,
        old.created_at, old.display_withdrawn_at) then
      raise exception 'The retention worker can only mark evidence bytes as purged.';
    end if;
    if new.purged_at is distinct from old.purged_at then
      if old.purged_at is not null or new.purged_at is null or old.storage_path is null
         or new.storage_path is not null
         or (new.reviewed_at, new.reviewed_by, new.rejection_reason)
           is distinct from (old.reviewed_at, old.reviewed_by, old.rejection_reason) then
        raise exception 'The retention worker can only mark evidence bytes as purged.';
      end if;
      return new;
    end if;
    if old.purged_at is not null and old.purged_at <= now() - interval '365 days'
       and new.storage_path is null and new.purged_at = old.purged_at
       and (new.reviewed_at, new.reviewed_by, new.rejection_reason) is not distinct from (null::timestamptz, null::uuid, null::text) then
      return new;
    end if;
    raise exception 'The retention worker can only mark evidence bytes as purged or expire old review metadata.';
  end if;
  if tg_op = 'UPDATE' and not public.is_admin() then
    if auth.uid() = old.owner_id and old.document_type = 'vehicle_photo'
      and old.display_withdrawn_at is null and new.display_withdrawn_at is not null
      and (new.id, new.owner_id, new.vehicle_id, new.document_type, new.storage_path, new.status,
          new.expires_on, new.rejection_reason, new.created_at, new.reviewed_at, new.reviewed_by, new.purged_at)
         is not distinct from
         (old.id, old.owner_id, old.vehicle_id, old.document_type, old.storage_path, old.status,
          old.expires_on, old.rejection_reason, old.created_at, old.reviewed_at, old.reviewed_by, old.purged_at) then
      return new;
    end if;
    raise exception 'Only an administrator can review verification documents.';
  end if;
  if tg_op = 'UPDATE' and old.purged_at is not null and new.status is distinct from old.status then
    raise exception 'Purged evidence cannot be reviewed; request a fresh upload.';
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

create or replace function public.withdraw_optional_vehicle_photo(p_document_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'owner' and not p.is_blocked
  ) then raise exception 'Only an active owner can remove a vehicle photo.'; end if;
  if not public.is_active_user() then raise exception 'Sign in to manage vehicle photos.'; end if;
  update public.verification_documents d
    set display_withdrawn_at = now()
    where d.id = p_document_id and d.owner_id = (select auth.uid())
      and d.document_type = 'vehicle_photo' and d.vehicle_id is not null
      and d.purged_at is null and d.display_withdrawn_at is null
      and exists (select 1 from public.vehicles v where v.id = d.vehicle_id and v.owner_id = d.owner_id);
  if not found then raise exception 'Vehicle photo is no longer available to remove.'; end if;
end;
$$;
revoke all on function public.withdraw_optional_vehicle_photo(uuid) from public, anon;
grant execute on function public.withdraw_optional_vehicle_photo(uuid) to authenticated;

create or replace function public.can_read_display_photo(p_document_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select viewer.role = 'customer' and not viewer.is_blocked
      and document.status = 'approved' and document.purged_at is null and document.display_withdrawn_at is null
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

create or replace function public.enqueue_verification_purge_paths(p_owner_id uuid, p_vehicle_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.verification_storage_purge_queue (document_id, storage_path, reason)
  select d.id, d.storage_path, p_reason
  from public.verification_documents d
  where d.purged_at is null
    and (p_owner_id is null or d.owner_id = p_owner_id)
    and (p_vehicle_id is null or d.vehicle_id = p_vehicle_id)
  on conflict (storage_path) do nothing;
end;
$$;
revoke all on function public.enqueue_verification_purge_paths(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.enqueue_verification_purge_paths(uuid, uuid, text) to service_role;

create or replace function public.queue_deleted_account_evidence()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_verification_purge_paths(old.id, null, 'account_deleted');
  return old;
end;
$$;
create trigger queue_account_evidence_before_delete
  before delete on public.profiles
  for each row execute procedure public.queue_deleted_account_evidence();

create or replace function public.queue_deleted_vehicle_evidence()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_verification_purge_paths(null, old.id, 'vehicle_deleted');
  return old;
end;
$$;
create trigger queue_vehicle_evidence_before_delete
  before delete on public.vehicles
  for each row execute procedure public.queue_deleted_vehicle_evidence();

create or replace function public.enqueue_due_verification_purges()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_cutoff timestamptz := now() - interval '30 days';
  v_count integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Only the retention worker may queue evidence files.' using errcode = '42501';
  end if;

  insert into public.verification_storage_purge_queue (document_id, storage_path, reason)
  select d.id, d.storage_path,
    case
      when d.status = 'rejected' then 'rejected'
      when d.expires_on is not null and d.expires_on <= ((now() at time zone 'Asia/Kolkata')::date - 30) then 'expired'
      when d.display_withdrawn_at is not null then 'display_photo_withdrawn'
      when exists (
        select 1 from public.verification_documents newer
        where newer.owner_id = d.owner_id and newer.vehicle_id is not distinct from d.vehicle_id
          and newer.document_type = d.document_type
          and (newer.created_at > d.created_at or (newer.created_at = d.created_at and newer.id > d.id))
          and newer.created_at <= v_cutoff
      ) then 'superseded'
      when d.document_type = 'selfie' and d.status = 'approved' then 'driver_consent_withdrawn'
      when d.status = 'approved' then 'approved_reviewed'
      else 'superseded'
    end
  from public.verification_documents d
  left join public.profiles p on p.id = d.owner_id
  where d.purged_at is null
    and (
      (d.status = 'rejected' and coalesce(d.reviewed_at, d.created_at) <= v_cutoff)
      or (d.status = 'approved' and d.document_type not in ('vehicle_photo', 'selfie')
        and coalesce(d.reviewed_at, d.created_at) <= v_cutoff)
      or (d.status = 'approved' and d.document_type = 'selfie' and not coalesce(p.show_driver_photo, false)
        and greatest(coalesce(d.reviewed_at, d.created_at), coalesce(p.show_driver_photo_updated_at, p.created_at)) <= v_cutoff)
      or (d.document_type = 'vehicle_photo' and d.display_withdrawn_at is not null and d.display_withdrawn_at <= v_cutoff)
      or (d.expires_on is not null and d.expires_on <= ((now() at time zone 'Asia/Kolkata')::date - 30))
      or exists (
        select 1 from public.verification_documents newer
        where newer.owner_id = d.owner_id and newer.vehicle_id is not distinct from d.vehicle_id
          and newer.document_type = d.document_type
          and (newer.created_at > d.created_at or (newer.created_at = d.created_at and newer.id > d.id))
          and newer.created_at <= v_cutoff
      )
    )
  on conflict (storage_path) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.enqueue_due_verification_purges() from public, anon, authenticated;
grant execute on function public.enqueue_due_verification_purges() to service_role;

create or replace function public.claim_verification_purge_batch(p_limit integer default 50)
returns table (id uuid, document_id uuid, storage_path text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Only the retention worker may claim evidence files.' using errcode = '42501';
  end if;
  return query
    with claimable as (
      select q.id from public.verification_storage_purge_queue q
      where q.attempts < 8 and (q.claimed_at is null or q.claimed_at < now() - interval '15 minutes')
      order by q.queued_at, q.id
      for update skip locked
      limit least(greatest(coalesce(p_limit, 50), 1), 100)
    )
    update public.verification_storage_purge_queue q
      set claimed_at = now(), attempts = q.attempts + 1, last_error_code = null
      from claimable c where q.id = c.id
    returning q.id, q.document_id, q.storage_path;
end;
$$;
revoke all on function public.claim_verification_purge_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_verification_purge_batch(integer) to service_role;

create or replace function public.complete_verification_purge(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_document_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Only the retention worker may complete evidence purges.' using errcode = '42501';
  end if;
  select q.document_id into v_document_id
  from public.verification_storage_purge_queue q
  where q.id = p_id and q.claimed_at > now() - interval '15 minutes'
  for update;
  if not found then raise exception 'Evidence purge claim is missing or expired.'; end if;
  update public.verification_documents
    set purged_at = coalesce(purged_at, now()), storage_path = null
    where id = v_document_id and purged_at is null;
  delete from public.verification_storage_purge_queue where id = p_id;
end;
$$;
revoke all on function public.complete_verification_purge(uuid) from public, anon, authenticated;
grant execute on function public.complete_verification_purge(uuid) to service_role;

create or replace function public.retry_verification_purge(p_id uuid, p_error_code text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Only the retention worker may retry evidence purges.' using errcode = '42501';
  end if;
  update public.verification_storage_purge_queue
    set claimed_at = null, last_error_code = left(coalesce(p_error_code, 'storage_error'), 40)
    where id = p_id;
end;
$$;
revoke all on function public.retry_verification_purge(uuid, text) from public, anon, authenticated;
grant execute on function public.retry_verification_purge(uuid, text) to service_role;

create or replace function public.purge_old_verification_review_metadata()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Only the retention worker may purge old review metadata.' using errcode = '42501';
  end if;
  update public.verification_documents
    set reviewed_at = null, reviewed_by = null, rejection_reason = null
    where purged_at is not null
      and purged_at <= now() - interval '365 days'
      and (reviewed_by is not null or rejection_reason is not null or reviewed_at is not null);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.purge_old_verification_review_metadata() from public, anon, authenticated;
grant execute on function public.purge_old_verification_review_metadata() to service_role;
