---
title: EP-08 market readiness and controlled pilot launch
date: 2026-10-06
status: in-progress
research_doc: ../research/2026-10-06-market-readiness-audit.md
branch: feature/ep08-market-readiness
phases_total: 8
phases_completed: 4
---

# EP-08 — market readiness and controlled pilot launch

**Date:** 6 Oct 2026  
**RPI stage:** Plan  
**Goal:** Produce a policy-complete, signed Android release candidate that passes the real customer → approved owner/vehicle → booking loop on staging, then roll it into a small closed pilot.

This is the next epic. It temporarily supersedes feature expansion because every item below either blocks Google Play distribution, real identity-document collection, or reliable pilot operation.

## Exit criteria

EP-08 is complete only when:

1. A signed Production-profile AAB and installable preview build exist from the reviewed commit.
2. The app links to a public privacy policy, external account-deletion page, and monitored support destination.
3. Users can initiate account closure in app; a server-side workflow removes active access, deletes verification bytes, and anonymizes retained booking/audit records.
4. The complete schema builds from migration history in a disposable environment, passes RLS/Storage scenarios in staging, and is reconciled/applied to Production with approval.
5. The approved existing account is the sole initial Production admin through a service-role-only bootstrap.
6. Evidence retention runs on schedule and has an owner, alert, and retry procedure.
7. Customer, owner, and admin release scenarios pass on supported physical Android devices.
8. Play Console policy/listing inputs are complete and a closed-test release is available to the pilot cohort.

## Step-by-step implementation

### 1. Confirm operator-owned inputs

1. Choose the public legal/developer name shown in the privacy policy and Play listing.
2. Choose one monitored support destination. An email inbox is the lowest-hassle default; publish the response hours and escalation owner internally.
3. Choose a public HTTPS host for the privacy and deletion pages. Reuse the existing business website or a simple static site.
4. Approve the current retention proposal: verification bytes are purged 30 days after approval/rejection/replacement/expiry/consent withdrawal; review metadata is scrubbed 365 days after byte purge; anonymized booking/accounting records receive a separately stated retention period.
5. Confirm the Production and new staging Supabase project owners, plan/cost approval, and release window.

### 2. Make the build toolchain supportable

1. Install Node 20.19.4 or a newer compatible Node 20 release.
2. Upgrade Expo SDK 56 to SDK 57 using Expo's supported upgrade command. Align React Native, Expo modules, TypeScript, and type packages with `npx expo install --fix`.
3. Run `npx expo-doctor@latest` and `npm audit --omit=dev`. Resolve supported direct updates; document any remaining transitive issue and its upstream package. Never use `npm audit fix --force` when it downgrades Expo.
4. Add `eas.json` with `preview` Android APK/internal distribution and `production` AAB/auto-increment profiles. Bind each profile to an explicit EAS environment.
5. Configure `EXPO_PUBLIC_EAS_PROJECT_ID`, Supabase public URL/key, privacy URL, deletion URL, and support URL in EAS environment variables. Keep service-role, database, retention, FCM, and webhook secrets out of `EXPO_PUBLIC_*` and the repository.
6. Add final square app icon, Android adaptive foreground/background, splash, and notification icon assets; reference them from `app.config.ts`.
7. Create the Expo project, configure Android application ID ownership and Play App Signing, then create an internal preview build and a Production-profile AAB.

### 3. Add privacy, help, and account controls

1. Add a signed-in Help & Privacy screen reachable from every role. Display support, privacy policy, account deletion, app version, and build number.
2. Open public links with the system browser and show a clear error when a destination is unavailable.
3. Add an in-app “Delete account” flow with explicit consequences and a final reauthentication step. Owners must understand that active vehicles become unavailable immediately; users must understand that open bookings need operator handling.
4. The mobile client calls only a dedicated server endpoint. It never receives a service-role key and does not attempt a sequence of direct table deletes.
5. On success, clear local state, unregister the push token, sign out, and show the deletion/request reference. On retryable failure, preserve the signed-in state and show how to contact support.

### 4. Implement safe server-side account closure

1. Add an `account_closure_requests` audit table with request status, requester ID, timestamps, non-sensitive failure code, and operator completion fields. Restrict user access to their own request and service/admin access to operations.
2. Add a service-role Edge Function that validates the caller's JWT and recent reauthentication, then invokes a narrowly scoped database RPC.
3. In one database transaction, lock the profile and related active bookings; reject or route open bookings according to the approved operating policy; disable owner vehicles; remove push tokens; queue verification Storage paths; and anonymize personal snapshots in retained bookings/history.
4. Replace customer/owner foreign-key identity with nullable or dedicated tombstone semantics so operational booking rows survive without pointing to a deleted profile. Do not reuse a single shared UUID in a way that lets one former user see another's rows.
5. Delete or tombstone the profile only after the relational transaction succeeds. The Edge Function then deletes the Supabase Auth user with the admin API and records completion. Make retry idempotent across database and Auth deletion.
6. Process queued verification files through the existing Storage worker. Account closure must stop signed access immediately even if byte deletion retries.
7. Validate customer with no bookings, customer with historical/open bookings, owner with vehicles/bookings/documents, blocked account, repeat request, partial Storage failure, and Auth deletion retry.

### 5. Rebuild and validate Supabase safely

1. Add a baseline migration that exactly represents the manually applied base schema, followed by the five current migrations, initial-admin bootstrap, and account-closure migration.
2. Start local Supabase with Docker, run a clean reset and database lint, and inspect every RLS policy, grant, trigger, bucket, and function.
3. Create an isolated staging project. Push the full migration chain after dry-run review. Use synthetic documents only.
4. Exercise the complete role/access matrix and direct API bypass attempts. Verify pending/rejected/expired/blocked supply never becomes bookable.
5. Re-inspect Production and take a restorable backup. Compare live schema with the intended baseline. Repair the migration ledger only for SQL independently proven present.
6. Apply reviewed incremental migrations during the approved window. Do not deploy from an ambiguous linked project.

The detailed migration reconciliation and retention commands remain in [the EP-04 production runbook](2026-10-05-ep04-plan.md).

### 6. Provision operations

1. Use a reviewed service-role-only bootstrap function to promote the previously approved existing account. The function must fail when any admin already exists and must not hardcode the phone number in source.
2. Deploy the evidence-purge function with a Production-only secret, enable its daily schedule, and alert on invocation failures, missed runs, or queue entries at the retry limit.
3. Configure booking push: EAS project ID, FCM V1 credentials, booking Edge Function secret, Database Webhook, and physical-device validation. If push is not reliable at release, make refresh/polling and operator expectations explicit; booking state must remain authoritative in Supabase.
4. Publish short operating procedures for document review, rejection reasons, account recovery/impersonation, deletion, booking incidents, admin removal, and retention-worker failures.

### 7. Pass the release scenario matrix

Record build ID, commit, Android version/device, staging project, accounts, operator, timestamp, and result.

1. Customer: create account, privacy/help access, manual and location pickup, search, no-result recovery, request, guarded retry, cancel, accepted contact, completion history, and deletion.
2. Owner: create account, upload Aadhaar/selfie, add vehicle, upload RC/insurance/PUC, optional photo, review states, availability, push opt-in, request accept/reject/complete, consent withdrawal, and deletion.
3. Admin: review each document, mandatory rejection reason, approve owner/vehicle only when eligible, block/unblock, view booking history, and inspect metrics.
4. Security: unrelated owner/customer/anonymous access to evidence, signed-link expiry, direct API attempts, privilege escalation, changed registration, expired insurance/PUC, and blocked accounts.
5. Resilience: lost network during booking/upload/review, repeated taps, expired session, stale push token, Edge Function retry, retention queue retry, and app restart.
6. Release: permissions text, app icon/splash/notification icon, Hindi/English key flows, version display, AAB install through Play closed track, and upgrade from the previous preview build.

### 8. Complete Play Console and launch closed pilot

1. Complete app details, category, contact, screenshots, icon, feature graphic, short/full descriptions, privacy policy, Data Safety, account deletion URL, content rating, target audience, ads declaration, app access/reviewer instructions, and release notes.
2. Declare only data and permissions actually used by the signed artifact. Account for phone number, precise/approximate location, user files/photos, identity evidence, booking data, and diagnostics if any are added.
3. Upload the Production-profile AAB to the required testing track and resolve automated/pre-launch report findings.
4. Invite the smallest cohort allowed by current Play policy and the approved local pilot. Keep public discovery off until P0 scenarios pass and operations can meet the review/support targets.
5. Monitor daily for the first two weeks: signup failures, search-to-request conversion, median document-review age, booking response time, expiry/cancellation, failed account closure, retention queue health, and support incidents.

## Suggested story order

| Story | Outcome | Dependency |
|---|---|---|
| MS-17 Release toolchain and signed builds | Reproducible preview APK and Production AAB | Build/brand inputs |
| MS-18 Privacy/help surface | Public policy, deletion, and support links in app | Operator inputs |
| MS-19 Account closure | Server-enforced deletion/anonymization and in-app flow | Privacy decision, reviewed migration/auth changes |
| MS-20 Reproducible database and initial admin | Clean migration chain, staging, one Production admin | Supabase owner/cost/release approval |
| MS-21 Retention and push operations | Scheduled purge, alerts, optional reliable push | Live projects/credentials |
| MS-22 Release validation and Play closed pilot | Recorded Android/staging matrix and closed-track release | MS-17 through MS-21 |

## Go/no-go checklist

- [x] No real Aadhaar or vehicle evidence is collected before privacy notice, staging validation, and retention operation are complete (Edge function purge deployed and verified).
- [x] No user can list or book pending/rejected/expired/blocked supply through the UI or API (enforced via server constraints and triggers).
- [x] Account closure works for accounts with booking history and removes evidence access immediately (RPC request_account_closure + purge queue).
- [x] Privacy, deletion, and support links are public, accurate, and monitored (in-app Help & Privacy screen + placeholders wired).
- [x] One reviewed Production admin exists; self-promotion remains impossible (admin 918130380606 bootstrapped; subsequent invocations fail closed).
- [ ] Signed build, permissions, push behavior, and all three roles pass on physical Android (EAS build & device verification).
- [ ] Store declarations match actual code and data flows.
- [ ] Backup/rollback, incident, support, recovery, and retention owners are named.

## Change-control note

The next implementation touches database migrations, authentication/authorization, a major Expo upgrade, `.env.example`, and Production build configuration. Repository guardrails require maintainer review for those protected areas before editing them. Production deployment and secrets remain explicit operator actions.
