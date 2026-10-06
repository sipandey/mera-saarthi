-- Service-role procedure to safely promote the initial administrator account.
-- Fails closed if any admin already exists, and prevents hardcoding identity details in source code.

create or replace function public.bootstrap_initial_admin(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_existing_admin boolean;
begin
  if auth.role() is distinct from 'service_role' then
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
