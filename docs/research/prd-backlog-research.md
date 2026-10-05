# PRD backlog implementation research

> **Historical snapshot (2 Oct 2026):** this research predates document verification, optional display photos, and the current product crosswalk. Use [the product handoff](../product/README.md), [current application map](../product/current-state.md), and [epics and stories](../plans/prd-backlog-implementation.md) as the active source of truth. The investigation below is retained for its rationale and must not be treated as a current code inventory.

**Reviewed:** 2 Oct 2026
**Scope:** Supabase-backed Android pilot; no-SMS phone/password; one Indian pilot market; cash-only.

## Repository findings

- At the start of this review, `supabase/schema.sql` was the only database source file; this work adds timestamped follow-on migrations. There is still no Supabase CLI project configuration, staging project, or database test harness in this repository.
- Public vehicle search uses a default `security_invoker = false` view. The view currently excludes blocked owners but does not check review state because no such state exists.
- Vehicle insert RLS allows every active owner to create an available vehicle. Booking insert RLS checks vehicle availability but does not check owner or vehicle review state.
- A trigger serializes vehicle slot checks. It considers every pending request active forever. The current booking enum has no `expired` or `completed` state.
- Owners can accept/reject pending requests, but accepted trips have no completion action. Customer cancellation has no reason. No state-change history exists.
- Outstation search asks the customer to estimate kilometres and multiplies that guess by the rate, then displays it as a quote. Keep the vehicle's ₹/km rate, store that rate with the booking, and do not invent a total.
- The owner dashboard is already the lowest-cost place for approval review and basic pilot counts. A separate web admin is unnecessary for the first town.
- Booking creation only announces success after the Supabase insert, but double taps are not guarded and retries have no idempotency key. Polling failures are currently ignored.

## Security and implementation decisions

1. Add owner review state to profiles and approval state plus vehicle registration number to vehicles. Existing owners and vehicles start pending, which fails closed. An admin must approve both before listings become searchable or bookable.
2. Keep the public listing view tightly filtered to active customers/admins and explicitly approved, available vehicles with approved owners. Keep phone numbers out of the view.
3. Keep booking authorization and transitions in PostgreSQL. Pending requests expire 15 minutes after creation. On app refresh, expire stale rows; the slot trigger also ignores stale pending rows so a missed refresh cannot block a cab. Use an optional Supabase Cron schedule for timely state updates when the operator enables it.
4. Record booking status transitions with actor and timestamp in a separate append-only history table. Keep rejection, cancellation, and completion details separate from immutable booking-trip fields.
5. Outstation fares display the driver's saved ₹/km rate and a clear “confirm final fare with driver” message. Do not require customer kilometres or multiply a customer guess into an amount.
6. Availability hours are optional daily India-local (`Asia/Kolkata`) windows. A blank window means “available now” follows the existing switch. A configured window is inclusive at start and exclusive at end; overnight windows are not supported in the first pilot.
7. Record only event name, time, and optional booking UUID for funnel metrics. Do not store phone, customer name, location, destination, fare, or free-form JSON properties in analytics.
8. Use Expo Push Service for the pilot. Expo's official setup requires `expo-notifications`, a development/production build, and Android FCM V1 credentials; keep service credentials out of Git. The app registers owner tokens on explicit opt-in, and a Supabase Edge Function accepts only a secret-protected database webhook, rechecks owner/vehicle approval, and sends generic notification text with only a booking UUID. Push delivery failure must never roll back or change a booking.
9. No support phone number or email is configured in the project. Add cancellation reasons now; do not invent a public support destination.

## External technical references

- Supabase advises enabling RLS for exposed tables, granting only required operations, and reviewing views because default views can bypass RLS: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Supabase recommends `security invoker` where possible; `security definer` functions must pin `search_path` and explicitly qualify relations: [Database Functions](https://supabase.com/docs/guides/database/functions).
- Supabase Cron can invoke a database function on a schedule using `pg_cron`; it is optional for lazy expiry correctness: [Cron](https://supabase.com/docs/guides/cron).
- Expo push setup requires a device token, a development build, and Android FCM configuration: [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [Android FCM V1 credentials](https://docs.expo.dev/push-notifications/fcm-credentials/).

## Decisions needing operator input before live rollout

- Which pilot town/market and contact number should appear on a booking help action?
- Who is the initial admin account, and what process will verify owner vehicle registrations?
- Whether the project owner will configure Firebase FCM and a Supabase Cron job for push and on-time expiry updates.
- Human-assisted password recovery process, since SMS verification/recovery is intentionally disabled.

## Implementation outcome and remaining checks

- Implemented: owner/vehicle review, booking expiry/completion/history, fare clarity, availability windows, cancellation/no-show reasons, weak-network retry, non-PII funnel counters, and explicit opt-in Android owner push code.
- Implemented but not deployed: two SQL migrations and the `send-booking-request` Edge Function. They need review and application in a disposable Supabase project before production.
- Still needs operator setup: apply migrations; configure EAS project and Android FCM V1 credentials; deploy the function; create the secret-header Database Webhook; validate push delivery and lifecycle/RLS behavior on Android and a disposable Supabase project; supply the real stand contact and account recovery process.
- No production database was queried or modified during this work. Local validation is a TypeScript typecheck of the React Native app plus `git diff --check`; SQL, Edge Function runtime, and Android behavior remain unverified.
