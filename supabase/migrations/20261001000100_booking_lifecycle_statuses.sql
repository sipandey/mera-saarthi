-- PostgreSQL requires new enum values to commit before they can be used.
alter type public.booking_status add value if not exists 'expired';
alter type public.booking_status add value if not exists 'completed';
