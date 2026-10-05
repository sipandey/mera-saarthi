# Current application map

**Snapshot:** 5 Oct 2026. Describes the working tree, including local driver/vehicle verification and photo changes.  
**Code is not proof of deployment:** the remote Supabase project is not linked here.

## User-visible areas

| Area | Current behavior | Main implementation |
|---|---|---|
| Sign-in and demo entry | Phone/password Supabase sign-in/sign-up for customer or owner; no SMS confirmation flow; demo entry switches among customer, owner, and admin and persists local sample state | `App.tsx`, `src/supabase.ts`, `src/components/Primitives.tsx` |
| Customer home and search | Local vs outstation; pickup text with Photon autocomplete and optional foreground location; manual pickup remains available; vehicle filter, date/time, local duration or outstation destination/duration | `src/screens/CustomerScreens.tsx`, `src/components/LocationPicker.tsx`, `App.tsx` |
| Results and quote | Only eligible available cabs; local hourly/full-day quote; outstation saved one-way ₹/km rate, with final fare agreed directly; rate sort; no-results recovery; optional driver and vehicle photos | `src/components/CabCard.tsx`, `src/screens/CustomerScreens.tsx`, `App.tsx` |
| Booking | Review screen, cash explanation, idempotent request attempt, server-confirmed success, booking status card, cancellation/rejection reasons, contact after acceptance via system dialer | `src/components/BookingConfirmation.tsx`, `src/components/BookingCard.tsx`, `App.tsx`, `src/cloudData.ts` |
| Owner dashboard | Driver evidence checklist, opt-in selfie display switch, vehicle cards, required RC/insurance/PUC uploads, optional vehicle-photo upload, expiry fields, approval/availability state, rates/hours, booking actions, optional Android push setup | `src/screens/OwnerScreens.tsx`, `src/components/BookingCard.tsx`, `src/pushNotifications.ts`, `App.tsx` |
| Admin dashboard | Review queue with file open/approve/reject, owner/vehicle approve/reject gates, block/unblock, booking list/status actions, weekly counts in cloud mode; equivalent state-changing actions in demo | `src/screens/AdminScreen.tsx`, `App.tsx` |
| Language and common UI | Hindi/English switch; common mobile components/theme | `src/i18n.ts`, `src/theme.ts`, `src/components/*` |

## Core booking and approval invariants

```text
Owner is eligible
  = owner account approved AND not blocked
  AND latest Aadhaar approved AND latest selfie approved

Vehicle is eligible
  = owner eligible AND vehicle approved AND not blocked
  AND registration number valid
  AND latest RC approved and newer than a registration-number change
  AND latest insurance approved and unexpired
  AND latest PUC approved and unexpired
  AND owner has made the vehicle available for the requested time

Booking request is eligible
  = customer is active AND vehicle is eligible
  AND no accepted or unexpired pending request overlaps that cab's time slot
```

Driver display-photo opt-in and vehicle photo are presentation fields only. A pending/rejected vehicle photo does not change the eligibility expression. An approved selfie appears on customer results only when `profiles.show_driver_photo` is true. Customer display links are short-lived and are issued only for approved photos associated with currently bookable supply. Aadhaar, RC, insurance, and PUC remain private admin/owner evidence.

Required driver evidence: Aadhaar + selfie. Required vehicle evidence: RC + insurance + PUC. Optional display evidence: vehicle photo. Do not add optional photos to approval-readiness arrays.

## Booking lifecycle

```mermaid
stateDiagram-v2
  [*] --> pending: customer request confirmed
  pending --> accepted: owner accepts
  pending --> rejected: owner/admin rejects
  pending --> cancelled: customer cancels
  pending --> expired: 15-minute server expiry
  accepted --> cancelled: permitted cancellation with reason
  accepted --> completed: owner completes ride
```

The database validates transitions, snapshots fare/vehicle/owner details, maintains status history, and ignores expired pending requests for overlap checks. App refresh lazily changes stale requests to `expired`; an optional Supabase Cron job can keep the displayed status timely while all clients are idle.

## Source and system map

| Concern | Source of truth | Notes |
|---|---|---|
| Screen flow, demo fixtures, cloud orchestration | `App.tsx` | Page state, search eligibility, booking attempts, auth, uploads, review handlers, notification tap routing |
| Domain types | `src/types.ts` | Roles, cabs, booking statuses, documents, store |
| Cloud client and transformations | `src/cloudData.ts` | Supabase reads/mutations, Storage uploads and signed links, lifecycle RPCs, pilot events |
| Base relational schema | `supabase/schema.sql` | Run once on a fresh project before timestamped migrations |
| Ordered incremental schema/security changes | `supabase/migrations/*.sql` | Four local migrations at this snapshot; review/apply in timestamp order |
| Booking notifications | `src/pushNotifications.ts`, `supabase/functions/send-booking-request/index.ts` | Expo token registration + secret-protected DB webhook target; requires external EAS/FCM/Supabase setup |
| Place lookup | `src/components/LocationPicker.tsx` | Photon public service; internet-dependent and without a production SLA |
| Local persistence | AsyncStorage in `App.tsx` | Demo data only; cloud records are Supabase-backed |

### Local migrations at this snapshot

1. `20261001000100_booking_lifecycle_statuses.sql`
2. `20261001000200_pilot_booking_workflows.sql`
3. `20261003000100_driver_vehicle_verification_documents.sql`
4. `20261003000200_optional_public_vehicle_photos.sql`

For a fresh database, run `supabase/schema.sql` once and then all four migrations in timestamp order. For an existing project, inspect its migration history before choosing pending migrations. No project reference/configuration is present in this repository; remote migration status must not be inferred from these files.

### Main persisted entities

- `profiles`: role, contact, block state, owner review state, optional driver-photo visibility preference.
- `vehicles`: owner, type/capacity/rates/registration, review/block/availability state and optional India-local daily hours.
- `verification_documents`: latest/versioned file evidence, document type, owner/vehicle scope, review state, expiry/rejection metadata, private Storage path.
- `bookings`: trip snapshot, request key, per-km rate snapshot, expiry, status and supported reason.
- `booking_status_history`: actor/time/reason for booking transitions.
- `push_tokens`: owner's opt-in Expo token(s).
- `pilot_events`: privacy-limited event and optional booking UUID; admin reads weekly aggregates.

## Demo coverage and limits

| Fixture / path | What it demonstrates | What it does not prove |
|---|---|---|
| Ramesh Kumar / Maruti Swift | Approved driver and vehicle; bookable positive path; approved photo placeholder; selfie display opt-in | Real identity, real vehicle photo, Storage link, customer RLS |
| Suresh Yadav / Mahindra Bolero | Missing/pending/rejected driver/vehicle evidence; rejected selfie reason; pending optional vehicle photo; disabled approval until required evidence is ready | Camera/file selection, actual private file preview, live server gates |
| Amit Patel / Maruti Dzire | Approved driver but rejected insurance; vehicle approval stays incomplete | SQL trigger/RLS enforcement against API bypass |
| Meena Devi / Tata Tigor | Expired insurance makes otherwise reviewed supply ineligible | Date/time behavior across real Android timezone settings |
| Demo owner/admin loop | Submit synthetic replacement, review/approve/reject locally, test driver-photo opt-in and optional-photo non-gating | Supabase auth, migrations, signed URLs, push, external geocoder uptime |

Demo file paths are synthetic. The photo preview is a placeholder, not a real photograph. Real camera and document selection are cloud-only. Treat demo as a workflow/presentation fixture, not as an integration test.

## Known gaps and rollout dependencies

- The original source PRD is referenced by an earlier review but not present in the repo; see [product handoff](README.md).
- No Supabase project is linked, so migration state, actual RLS, live Storage policies, and Edge Function deployment are unknown. SQL/auth/storage changes require maintainer review and disposable-project validation.
- Phone/password accounts do not verify phone ownership. Password recovery and impersonation handling are not implemented; define human support before public launch.
- No stand contact/help or customer incident-reporting destination is configured. Support cannot be promised from the app.
- Decide document retention and secure deletion before collecting real Aadhaar or other identity files.
- Android push needs EAS project ID, FCM V1 credentials, deployed Edge Function, secret, Database Webhook, and device validation. Expo Go is not a push validation target.
- Photon public endpoint has no SLA. Choose a managed or hosted geocoder before public traffic.
- Date and time are plain text. Overnight availability windows are unsupported. Validate schedule behavior on Android in the pilot town.
- App, SQL, and push/runtime behavior have not been jointly validated against a disposable Supabase project in this workspace.
