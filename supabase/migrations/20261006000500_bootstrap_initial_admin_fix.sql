-- Migration: 20261006000500_bootstrap_initial_admin_fix.sql
-- Description: Allow service_role and database superusers in protect_profile_privileges
-- and bootstrap_initial_admin so the initial admin account can be bootstrapped.

create or replace function public.protect_profile_privileges() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Service role and database administrative roles are permitted
  if auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if (new.role is distinct from old.role or new.is_blocked is distinct from old.is_blocked)
     and not public.is_admin() then
    raise exception 'Only an administrator can change account role, review, or block status.';
  end if;

  if new.owner_review_status is distinct from old.owner_review_status and not (
    public.is_admin() or (new.owner_review_status = 'pending' and old.role = 'owner' and old.id = (select auth.uid()))
  ) then
    raise exception 'Only an administrator can approve or reject a driver.';
  end if;

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

create or replace function public.bootstrap_initial_admin(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_existing_admin boolean;
begin
  if auth.role() is distinct from 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Only the service role can invoke initial admin bootstrap.' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.profiles where role = 'admin'
  ) into v_existing_admin;

  if v_existing_admin then
    raise exception 'An administrator account already exists. Promotion must be performed by an existing administrator.';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Target user profile does not exist.';
  end if;

  update public.profiles
    set role = 'admin', is_blocked = false
    where id = p_user_id;

  return jsonb_build_object('success', true, 'admin_id', p_user_id, 'promoted_at', now());
end;
$$;

revoke all on function public.bootstrap_initial_admin(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_initial_admin(uuid) to service_role;
