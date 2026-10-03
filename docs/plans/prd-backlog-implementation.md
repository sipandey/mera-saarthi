# PRD backlog implementation plan

## Outcome

Deliver the one-town Android booking loop with server-enforced owner/vehicle approval, a complete request lifecycle, clear prices, basic operational visibility, and honest weak-network feedback. Retain phone/password with no SMS, cash payment, and the system phone dialer.

## Work sequence

1. **MS-02 approval gate (P0):** add owner/vehicle review states and registration number; fail closed for existing records; expose admin approve/reject actions; enforce in the database view, insert policies, and booking checks.
2. **MS-03 lifecycle (P0):** add 15-minute expiry, completed status, status history, allowed transitions, completion action, and lazy expiry on refresh. Provide optional Cron setup notes.
3. **MS-05 fare clarity (P0):** remove customer-estimated kilometres, persist the per-km rate snapshot, and show driver-confirmed total through results, confirmation, and bookings.
4. **MS-06 availability (P1):** add optional daily hours in Asia/Kolkata, updated-at display, and consistent search checks.
5. **MS-07 recovery (P1):** add useful empty-search suggestions without discarding entered search filters; keep price sorting.
6. **MS-08 safety (P1):** capture cancellation reason and no-show reports. Do not display a fictional help number; support contact is an operator input.
7. **MS-09 reliability (P1):** prevent double-submit, use a stable per-attempt idempotency key, preserve server-confirmed success semantics, and provide retry/offline wording.
8. **MS-10 pilot funnel (P1):** record non-PII event names and expose weekly aggregate counts to admin.
9. **MS-04 push (P0):** use Expo Push Service + Android FCM V1. The app registers owner tokens and routes notification taps to the request; `supabase/functions/send-booking-request` validates the database webhook, checks owner/vehicle approval, and dispatches generic push content. The production path remains unverified until the operator supplies Firebase/EAS credentials, deploys the function, configures the database webhook, and validates a development build. Never put service credentials in the app.
10. **MS-11 web admin:** remain deferred as specified; the in-app admin supports the first pilot.

## Review and rollout

- Apply migrations to a disposable Supabase project first and verify RLS using customer, pending owner, approved owner, blocked user, and admin accounts.
- Approve test owner and vehicle records, exercise booking accept/reject/cancel/expire/complete, and confirm the contact RPCs still disclose numbers only after acceptance.
- Build a development APK and validate location, dialer, push permission/token, notification tap routing, and all Hindi/English screen states on Android.
- For push: set `EXPO_PUBLIC_EAS_PROJECT_ID`, configure FCM V1 credentials in EAS, deploy the function, and create an INSERT webhook using `x-booking-webhook-secret` as described in README.
- Before a town pilot, provision an admin, configure FCM and optional Cron, publish the stand/help contact, and document manual account recovery.

## Current environment constraint

The repository's `.git` directory is read-only in the regular workspace. An elevated fetch attempt reached the configured remote, but the remote has no `main` ref (`git ls-remote --heads origin` returned no branches). The required updated-main base is unavailable, so do not create a feature branch from stale local `main`; preserve the existing uncommitted work and report the blocker. No commit or push was made.
