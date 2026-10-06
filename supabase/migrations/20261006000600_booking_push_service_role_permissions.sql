-- The booking push Edge Function uses the service-role REST API to look up
-- approved vehicles/owners and registered push tokens, and to remove stale
-- tokens returned by Expo. Grant only the table operations it needs.
grant select on table public.vehicles, public.profiles, public.push_tokens to service_role;
grant delete on table public.push_tokens to service_role;
