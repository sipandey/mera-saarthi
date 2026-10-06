# Mera Saarthi — epic and story backlog

**Snapshot:** 5 Oct 2026
**Canonical entry point:** [Product handoff](../product/README.md)
**Requirements:** [MVP requirements](../product/requirements-and-mvp.md)
**Implemented feature map:** [Current application map](../product/current-state.md)
**Sequencing and release gates:** [MVP roadmap](prd-mvp-roadmap.md)

This backlog maps the product requirements to behavior that exists in the working tree and to remaining rollout work. “Implemented” means source code is present. It does not mean SQL has been applied to a remote project or that app, database, Storage, push, and Android behavior have been verified together. Read the current-state map before changing eligibility, document review, booking lifecycle, or demo fixtures.

## Status and priority definitions

- **Implemented:** primary behavior exists in app/source and has a meaningful demo where appropriate.
- **Partial:** some behavior exists, but one or more acceptance criteria or edge cases are missing.
- **Rollout pending:** source exists; external configuration, security review, or integration validation remains before pilot use.
- **Deferred:** deliberately outside the first pilot; do not start without a product decision.
- **P0:** release-blocking for a trustworthy first pilot. **P1:** pilot operations and learning. **P2:** reconsider after evidence.

For combined states, the story has two independent parts: **Implementation** describes the repository; **Rollout** describes what has been proven in a disposable Supabase project/target Android build.

## Epics at a glance

| Epic | Outcome | Requirements | Stories |
|---|---|---|---|
| EP-01 Access and onboarding | People can enter as customer/owner; admin access is provisioned; demo stays synthetic | RQ-01 | MS-14, MS-15 |
| EP-02 Cab discovery and honest fare | Customer can find an eligible cab and understand its rate | RQ-02, RQ-03 | MS-05, MS-07, MS-16 |
| EP-03 Booking and safe contact | Booking is server-confirmed, conflict-safe, recoverable, and contact is released after acceptance | RQ-04, RQ-05 | MS-01, MS-03, MS-09 |
| EP-04 Approved supply and listing trust | Required driver/vehicle evidence gates bookings; display photos are optional and consent-based | RQ-06, RQ-07 | MS-02, MS-12, MS-13 |
| EP-05 Stand operations | Owners manage supply; admins review, block, and observe pilot activity | RQ-08, RQ-10 | MS-06, MS-08, MS-10 |
| EP-06 Connectivity and notifications | Search/request recovery and optional push work under real network/device conditions | RQ-09 | MS-04, MS-09, MS-16 |
| EP-07 Learn and expand deliberately | Pilot measures outcomes before investment in expansion | RQ-10 | MS-10, MS-11 |
| EP-08 Market readiness and launch | Release configuration, privacy/help surface, account closure, reproducible migrations, and staging validation | RQ-01, RQ-06, RQ-08 | MS-17, MS-18, MS-19, MS-20, MS-21, MS-22 |

## EP-01 — Access and onboarding

### MS-14 — Explore complete roles in demo mode

- **Requirement / priority:** RQ-01; P0.
- **Implementation:** Implemented. **Rollout:** Demo only; not a cloud integration test.
- **User story:** As a prospective customer, owner, or stand admin, I want to explore realistic role flows without creating a cloud account or uploading real evidence.
- **Acceptance criteria:** Demo state persists locally; role switching is available only in demo; fixtures show approved/bookable, pending/missing, rejected, and expired evidence cases; review and photo preference actions update the local state; no synthetic evidence is presented as genuine.
- **Demo path:** Open demo → switch Customer/Owner/Admin. Test Ramesh (positive), Suresh (missing/rejected), Amit (rejected insurance), and Meena (expired insurance). Submit/review a synthetic replacement and toggle selfie display preference.
- **Code:** `App.tsx`, `src/screens/AdminScreen.tsx`, `src/screens/OwnerScreens.tsx`, `README.md`.
- **Limit:** Placeholder images and local state do not demonstrate camera, file picker, Supabase Auth, Storage, RLS, or signed URLs.

### MS-15 — Sign in with a provisionable account

- **Requirement / priority:** RQ-01; P0.
- **Implementation:** Implemented. **Rollout:** Auth settings and recovery policy pending.
- **User story:** As a customer or owner, I want phone/password access; as an operator, I need to grant admin role outside public sign-up.
- **Acceptance criteria:** Sign-up offers customer or owner only; sign-in and persisted sessions use Supabase Auth; app does not claim phone ownership was verified; first admin is granted by an operator; demo can be opened without an account.
- **Demo path:** Demo can show entry only. Validate signup/session/admin provisioning in a configured disposable Supabase project.
- **Code:** `App.tsx`, `src/supabase.ts`, `README.md`.
- **Open operational criteria:** Choose Auth phone-confirmation settings and human-assisted account recovery before pilot. Do not add an admin self-signup route.

## EP-02 — Cab discovery and honest fare

### MS-05 — Show the correct fare basis

- **Requirement / priority:** RQ-02, RQ-03; P0.
- **Implementation:** Implemented. **Rollout:** Database snapshot and Android presentation require integration verification.
- **User story:** As a customer, I want a useful local estimate or outstation rate without being shown a made-up total.
- **Acceptance criteria:** Local uses hourly rate below 8 hours and full-day rate at/above 8 hours; outstation displays the saved one-way ₹/km rate and says to agree the final fare with the driver; customer-entered distance is not multiplied into a quoted total; booking stores the applicable rate snapshot.
- **Demo path:** Customer → search Local and Outstation → compare result card and confirmation.
- **Code:** `src/screens/CustomerScreens.tsx`, `src/components/CabCard.tsx`, `src/components/BookingConfirmation.tsx`, `src/cloudData.ts`, migrations.

### MS-07 — Recover from empty results

- **Requirement / priority:** RQ-02; P1.
- **Implementation:** Implemented. **Rollout:** Field usability pending.
- **User story:** As a customer who finds no cab, I want actionable alternatives that preserve my search details.
- **Acceptance criteria:** Empty results explain there is no eligible cab for the selected criteria; suggested changes are available without silently clearing pickup, time, or vehicle type; results can be sorted by price; only eligible and available vehicles are shown.
- **Demo path:** Customer → choose a search combination with no matching fixture → use suggestions, then sort a populated result set.
- **Code:** `src/screens/CustomerScreens.tsx`, `App.tsx`.

### MS-16 — Search trip places by suggestion or manual entry

- **Requirement / priority:** RQ-02, RQ-09; P0.
- **Implementation:** Implemented. **Rollout:** Photon uptime and Android permission flow pending field validation.
- **User story:** As a customer, I want pickup and outstation destination suggestions when connected and a manual path when internet is unavailable.
- **Acceptance criteria:** Typing can query India place suggestions for pickup and destination; current location is requested only after explicit action and applies to pickup; lookup failure leaves manual text entry available; no map permission is required for ordinary text entry.
- **Demo path:** Customer search → type a pickup and an outstation destination; choose suggestions and verify manual entry remains possible. The current-location affordance is pickup-only.
- **Code:** `src/components/LocationPicker.tsx`, `src/screens/CustomerScreens.tsx`.
- **Limit:** Public Photon service has no uptime guarantee. Select a managed/hosted provider before material public traffic.

## EP-03 — Booking and safe contact

### MS-01 — Reveal phone contact after acceptance

- **Requirement / priority:** RQ-05; P0.
- **Implementation:** Implemented in app/schema source. **Rollout:** Cloud RLS/RPC and Android dialer pending verification.
- **User story:** As a customer or owner, I want to call the other party only when a request is accepted.
- **Acceptance criteria:** Phone data is absent from public search results; accepted booking exposes contact via the authorized database path; pending/rejected/cancelled bookings do not expose it; app opens the system dialer rather than placing a call silently.
- **Demo path:** Customer requests a demo cab; owner accepts; inspect the accepted booking contact action. Also inspect pending and rejected states.
- **Code:** `src/components/BookingCard.tsx`, `src/cloudData.ts`, `supabase/schema.sql`, migrations.
- **Release check:** Attempt unauthorized direct API reads using separate customer accounts.

### MS-03 — Enforce a complete booking lifecycle

- **Requirement / priority:** RQ-04; P0.
- **Implementation:** Implemented in app and migration source. **Rollout:** Database transition, expiry, concurrency, and device behavior pending.
- **User story:** As a customer, owner, or admin, I want every request to show a valid, current state and avoid occupying a cab indefinitely.
- **Acceptance criteria:** Pending requests expire after 15 minutes; accepted/pending overlaps for the same vehicle are rejected; stale pending rows do not block a slot; allowed actors can accept/reject/cancel/complete only valid transitions; transition history records actor/time; refresh reconciles stale requests; completion is available after an accepted trip.
- **Demo path:** Create a request and exercise owner accept/reject plus customer cancellation/admin status views. Demo may simulate outcomes; it cannot prove database concurrency or scheduled expiry.
- **Code:** `src/components/BookingCard.tsx`, `src/cloudData.ts`, `src/screens/AdminScreen.tsx`, booking lifecycle migrations.
- **Release check:** Test concurrent requests, invalid transitions, and expiry against disposable Supabase. Cron is optional for timely idle-client display, not for slot correctness.

### MS-09 — Prevent duplicate booking attempts and recover from weak network

- **Requirement / priority:** RQ-04, RQ-09; P0.
- **Implementation:** Implemented in source. **Rollout:** Network/device validation pending.
- **User story:** As a customer on an unreliable connection, I want to know whether the server accepted my request and safely retry without creating duplicates.
- **Acceptance criteria:** Submit control prevents repeated taps; a stable key identifies a booking attempt; success is shown only after server confirmation; a retry after a timeout resolves the same attempt; refresh/read errors are visible or recoverable and do not fabricate success.
- **Demo path:** Customer → booking confirmation; inspect disabled/submitting/success states and retry copy. Demo cannot simulate server loss reliably.
- **Code:** `App.tsx`, `src/cloudData.ts`, booking migration(s).
- **Release check:** Use network throttling/disconnection on an Android development build and confirm duplicate prevention server-side.

## EP-04 — Approved supply and listing trust

### MS-02 — Gate every listing and booking on owner and vehicle approval

- **Requirement / priority:** RQ-04, RQ-05, RQ-06; P0.
- **Implementation:** Implemented in app/source and hardened with a shared latest-evidence/currentness helper. **Rollout:** Configured Production project lacks verification schema and migration history; RLS/trigger review, migration deployment, and isolated API-bypass validation pending.
- **User story:** As a stand admin, I want to approve a driver and each vehicle separately; as a customer, I must never book unapproved or blocked supply.
- **Acceptance criteria:** Owner needs explicit approval and no account block; vehicle needs explicit approval and no vehicle block; registration must be valid; required current latest evidence must be approved; changed registration invalidates old RC approval; expired/replaced required documents make supply ineligible; app search and database authorization enforce the same gate; existing records fail closed.
- **Demo path:** Admin review with Suresh/Amit/Meena; verify they do not appear as eligible until blockers are cleared. Block/unblock a fixture and observe search change.
- **Code:** `App.tsx`, `src/cloudData.ts`, `src/screens/AdminScreen.tsx`, `src/screens/OwnerScreens.tsx`, `supabase/schema.sql`, verification and workflow migrations.
- **Release check:** In disposable Supabase, attempt search and booking API bypass with pending/rejected/expired/blocked records; verify no private phone/evidence leakage.

### MS-12 — Upload, replace, and review required evidence

- **Requirement / priority:** RQ-06; P0.
- **Implementation:** Implemented in app/migration source; ImagePicker permissions are purpose-limited; a private-file retention queue/worker is implemented locally. **Rollout:** Production Storage policy, migration/function deployment, Vault/Cron setup, retention-policy approval, and actual-device picker/camera remain unverified.
- **User story:** As an owner, I want to submit and replace required identity/vehicle evidence; as an admin, I want to inspect a private file and approve or reject it with a reason.
- **Acceptance criteria:** Driver evidence is Aadhaar file + selfie; each vehicle evidence set is RC + current insurance + current PUC; review is per evidence item and per owner/vehicle; rejection reason is recorded; replacement creates a new version and returns the affected decision to review; evidence stays in a private bucket; only authorized owner/admin can access it; Aadhaar UID is not copied to text metadata.
- **Demo path:** Owner/Admin loop with synthetic pending/rejected/approved fixture items and a replacement. Demo is metadata/state simulation, not proof of actual file transfer.
- **Code:** `src/screens/OwnerScreens.tsx`, `src/screens/AdminScreen.tsx`, `src/cloudData.ts`, verification migration.
- **Release check:** Verify upload size/type, private Storage policies, signed-link expiry, unauthorized access denial, file purge + metadata retention behavior, and account-closure deletion procedure before using real Aadhaar.

### MS-13 — Offer optional, approved display photos with consent

- **Requirement / priority:** RQ-07; P1 (trust improvement; does not gate pilot eligibility).
- **Implementation:** Implemented in app/migration source. **Rollout:** Production photo migration is absent; signed URL permissions and display behavior need cloud/device verification.
- **User story:** As a driver, I want to opt in to showing my approved selfie; as an owner, I may add a vehicle photo; as a customer, I want to see approved photos on eligible listings.
- **Acceptance criteria:** Driver selfie remains evidence-required but is displayed only after explicit owner opt-in and admin approval; vehicle photo upload is optional and reviewed independently; owner can withdraw a vehicle photo; neither photo affects booking eligibility; rejected/pending/withdrawn/purged photos are not displayed; customer URLs are short-lived and generated only for otherwise bookable supply; fallback UI works when no approved photo is available.
- **Demo path:** Owner toggles selfie display; upload/review/withdraw an optional vehicle photo; customer results show synthetic approved-photo placeholders for Ramesh and fallback after withdrawal or for other fixtures.
- **Code:** `src/screens/OwnerScreens.tsx`, `src/components/CabCard.tsx`, `src/cloudData.ts`, `src/types.ts`, optional-photo migration.
- **Privacy rule:** Aadhaar, RC, insurance, and PUC are never customer listing images.

## EP-05 — Stand operations

### MS-06 — Set owner availability and working hours

- **Requirement / priority:** RQ-08; P1.
- **Implementation:** Implemented in app/migration source. **Rollout:** India-time and Android schedule validation pending.
- **User story:** As an approved owner, I want to publish only vehicles and hours when I can accept a booking.
- **Acceptance criteria:** Owner can toggle vehicle availability and set/clear optional daily hours; blank hours mean the availability switch controls supply; configured same-day window is start-inclusive/end-exclusive; overnight windows are unsupported and explained; search and booking use consistent checks.
- **Demo path:** Owner dashboard → edit availability and daily hours → customer search.
- **Code:** `src/screens/OwnerScreens.tsx`, search/data layer, workflow migration.

### MS-08 — Give admins basic safety and booking controls

- **Requirement / priority:** RQ-08; P1.
- **Implementation:** Partial: account/vehicle blocks, booking status/reasons, and a booking-history timeline are implemented in app/schema/demo. A dedicated incident-support workflow and admin status override are not implemented. **Rollout:** Operational policy/contact and live history-RLS validation pending.
- **User story:** As a stand admin, I want to block unsafe supply and understand cancellation/rejection/no-show outcomes.
- **Acceptance criteria:** Admin can block/unblock accounts and vehicles; booking state/reason/history is inspectable; supported cancellation/rejection/no-show reason is captured; the interface does not invent a support number; operators have a real help destination before public launch.
- **Demo path:** Create a request, transition it through owner accept/reject/cancel/complete/no-show actions, then switch to admin and inspect its ordered history. Block/unblock accounts and vehicles. Support contact is not demoed because none is configured.
- **Code:** `src/screens/AdminScreen.tsx`, `src/components/BookingCard.tsx`, `src/cloudData.ts`.
- **Open product decision:** Name the support owner/contact and incident escalation procedure.

### MS-10 — Measure the pilot funnel with limited data

- **Requirement / priority:** RQ-08, RQ-10; P1.
- **Implementation:** Implemented in app/schema source. **Rollout:** Collection, aggregation, retention, and success thresholds pending.
- **User story:** As a product/operator, I want weekly counts that show where booking flow succeeds or stalls without collecting trip/identity detail for analytics.
- **Acceptance criteria:** Admin can inspect weekly aggregate events; event data is limited to event name, timestamp, and optional booking UUID; analytics do not include phone, name, pickup, destination, fare, or arbitrary free-form properties; thresholds are defined before using counts to justify expansion.
- **Demo path:** Admin → weekly pilot metrics (demo counts are fixtures only).
- **Code:** `src/cloudData.ts`, `src/screens/AdminScreen.tsx`, pilot workflow migration.

## EP-06 — Connectivity and notifications

### MS-04 — Notify an opted-in owner of a new request

- **Requirement / priority:** RQ-09; P0 for the configured push path, but delivery is best-effort and not a booking correctness dependency.
- **Implementation:** Android client registration, the `pg_net` booking INSERT trigger, server-side eligibility checks, Expo ticket handling, invalid-token cleanup, opt-in/out, and tap routing exist. **Rollout:** Verify the trigger migration is applied; configure the EAS project/FCM V1, matching Edge Function and private-schema secrets; deploy the function; and validate on a physical Android device. Do not configure a second Database Webhook.
- **User story:** As an opted-in owner, I want a generic alert for a new request and a tap target that opens that request.
- **Acceptance criteria:** Owner explicitly enables or disables alerts; token is registered/removed appropriately, including invalid tokens; the database trigger/function sends only after rechecking eligibility; notification uses generic content and a booking UUID; tap navigates to the relevant request; notification failure never changes booking state; secrets remain server-side.
- **Demo path:** Demo may show booking arrival in the owner list; it does not send an Expo push. Live path requires installed development/store build (not Expo Go).
- **Code:** `src/pushNotifications.ts`, `supabase/functions/send-booking-request/index.ts`, `App.tsx`, README setup.
- **Release check:** Complete the EAS/FCM/function/trigger setup and verify token, Expo ticket/receipt behavior, permissions, stale-token cleanup, opt-out, and tap routing on Android. Expo ticket acceptance alone does not prove device delivery.

## EP-07 — Learn and expand deliberately

### MS-11 — Build separate web admin only when mobile operations require it

- **Requirement / priority:** RQ-10; P2, deferred.
- **Implementation:** Deferred by scope decision. The in-app mobile admin is the first-pilot surface.
- **User story:** As a stand operator, I may need a larger review surface if measured queue volume makes mobile administration too slow.
- **Acceptance criteria before starting:** Pilot evidence identifies mobile review as a real bottleneck; product owner defines roles/audit/access needs; web design reuses server-enforced policies and does not weaken evidence privacy; scope is approved.
- **Demo path:** None. Do not represent the mobile admin as a responsive web console.

## EP-08 — Market readiness and controlled pilot launch

### MS-17 — Release toolchain and signed builds

- **Requirement / priority:** RQ-01; P0.
- **Implementation:** Implemented. `eas.json` profiles (development, preview APK, production AAB) and `app.config.ts` legal/support environment bindings configured.
- **Rollout:** Completed. EAS project configured (@sipandey/mera-saarthi, project ID 5128596b-dc54-4eff-975e-73d3f6a17ab9), Android keystore provisioned, and preview APK build generated (Build #75c7004d-e66c-4925-a173-ba5dde7f8b6f).
- **Code:** `eas.json`, `app.config.ts`, `package.json`.

### MS-18 — Privacy, support, and help surface

- **Requirement / priority:** RQ-01, RQ-08; P0.
- **Implementation:** Implemented. Universal Help & Privacy screen accessible via `AppHeader` across all roles; displays app version/build, support contact actions, external privacy policy and web deletion links.
- **Rollout:** Deployment of live privacy and deletion web resources pending.
- **Code:** `src/screens/HelpPrivacyScreen.tsx`, `src/components/Primitives.tsx`, `src/i18n.ts`, `App.tsx`.

### MS-19 — Account closure and data anonymization

- **Requirement / priority:** RQ-01, RQ-06; P0.
- **Implementation:** Implemented. In-app deletion flow in `HelpPrivacyScreen.tsx`, `closeCloudAccount()` RPC client call, and migration `20261006000100_account_closure_and_anonymization.sql` with foreign key relaxation, purge queue enrollment, audit record, and personal snapshot anonymization.
- **Rollout:** Database migration execution and Auth admin deletion in staging pending.
- **Code:** `src/screens/HelpPrivacyScreen.tsx`, `src/cloudData.ts`, `App.tsx`, `supabase/migrations/20261006000100_account_closure_and_anonymization.sql`.

### MS-20 — Reproducible database, integrity hardening, and initial admin

- **Requirement / priority:** RQ-04, RQ-06, RQ-08; P0.
- **Implementation:** Implemented. Baseline migration `20260930000100_initial_schema.sql` copies base schema into migration history; `20261006000200_operational_integrity_hardening.sql` enforces normalized registration uniqueness (P0-2), server-side availability hours check (P0-3), acceptance-time eligibility recheck (P0-4); and `20261006000300_initial_admin_bootstrap.sql` adds safe service-role initial admin promoter.
- **Rollout:** Completed. All 11 migrations deployed and remote migration ledger reconciled. Initial admin 918130380606 promoted and verified with fail-close protection against duplicate promotions.
- **Code:** `supabase/migrations/20260930000100_initial_schema.sql`, `supabase/migrations/20261006000200_operational_integrity_hardening.sql`, `supabase/migrations/20261006000300_initial_admin_bootstrap.sql`, `supabase/migrations/20261006000500_bootstrap_initial_admin_fix.sql`.

### MS-21 — Evidence retention and push operations

- **Requirement / priority:** RQ-06, RQ-09; P0/P1.
- **Implementation:** Implemented. Edge Functions `purge-verification-files` and `send-booking-request` deployed (`--no-verify-jwt`). Migration `20261006000400_retention_cron_and_booking_webhook.sql` provisions `pg_net`, `pg_cron`, isolated `private.service_secrets` schema, asynchronous `trg_booking_inserted_push` trigger, and daily `daily-verification-purge` cron job (03:00 IST). End-to-end cron invocation verified live with 200 OK purge execution.
- **Rollout:** Completed on remote project `pgmbbtuphpfcjrswptzs`. Edge function secrets and database service secrets configured and operational.
- **Code:** `supabase/functions/purge-verification-files/`, `supabase/functions/send-booking-request/`, `supabase/migrations/20261006000400_retention_cron_and_booking_webhook.sql`.

### MS-22 — Release validation and Play closed pilot

- **Requirement / priority:** RQ-01, RQ-10; P0.
- **Implementation:** Implemented. `eas-cli` configured with remote version management, preview APK and production AAB signed builds generated, Google Play release dossier documented in `docs/product/google-play-release-dossier.md`, and static web compliance pages created in `public/privacy.html` and `public/delete-account.html`.
- **Rollout:** Preview APK (Build `#75c7004d-e66c-4925-a173-ba5dde7f8b6f`) and Production AAB (Build `#30166531-fb76-48c4-b863-c045d2ed1f09`) successfully compiled on EAS. Ready for Play Console closed testing track upload and physical pilot cohort rollout.
- **Code:** `docs/product/google-play-release-dossier.md`, `public/privacy.html`, `public/delete-account.html`, `eas.json`.

## Shared release checklist for P0 stories

1. Confirm the source-of-truth files in [product handoff](../product/README.md) and reconcile any newly supplied original PRD.
2. Review `supabase/schema.sql` plus every migration in timestamp order. The 5 Oct 2026 Production snapshot had no migration ledger and lacked the four local migration changes; re-inspect the target immediately before any rollout and reconcile the manually applied baseline first.
3. Apply to a disposable Supabase project and verify policies/triggers using customer, pending owner, approved owner, blocked owner/vehicle, and admin identities. Include direct API attempts, not just UI paths.
4. Validate evidence replacement/rejection, registration change, expiry, signed URL access, and that optional photos do not alter eligibility.
5. Validate booking idempotency, overlap under concurrent requests, all transitions, lazy/scheduled expiry behavior, contact gating, and history.
6. Validate real pickup fallback, confirmation/retry, schedule/date handling, dialer, and (if launch-critical) push on the supported Android development build.
7. Before real document collection, assign an admin, identity/RC review procedure, evidence retention/deletion owner, human recovery route, stand support contact, and incident escalation path.

## Agent change protocol

- Keep `MS-*` IDs stable. Add a new ID instead of reusing a completed one; update the epic table, roadmap crosswalk, requirements, and current-state map when behavior changes.
- For every story change, record **Implementation** and **Rollout** separately and link relevant screens, data functions, schema/migrations, and demo path.
- When changing booking eligibility, document evidence, photo visibility, contact disclosure, Storage, or RLS, first read `.agent-room/guardrails.md`, `.agent-room/decisions.md`, and `.agent-room/anti-patterns.md`; then update those records for material decisions/regressions.
- Do not claim a cloud migration is applied or a demo proves server security. Inspect the target project's migration state and validate against a disposable cloud project.
- Follow repository `AGENTS.md` branch workflow. Do not add/run tests unless the user asks; follow any higher-priority task-specific verification instructions.
- The external PRD v1.0 referenced by historical docs is not checked in. Ask for it or record its source before claiming this crosswalk exhausts that document's requirements.
