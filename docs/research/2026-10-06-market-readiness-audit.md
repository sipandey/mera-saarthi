---
title: Market readiness re-audit
date: 2026-10-06
status: completed
git_commit: 9b39081b896171741b59e929518f53a605dbd58a
branch: feature/market-readiness-audit
repository: https://github.com/sipandey/mera-saarthi.git
topic: market-readiness
tags:
  - android
  - supabase
  - privacy
  - release
---

# Market readiness re-audit

**Date:** 6 Oct 2026  
**Scope:** Repository, product flows, demo coverage, Android release inputs, Supabase rollout state, privacy/account lifecycle, and pilot operations.  
**Decision:** The application is suitable for continued synthetic demos, but it is not ready to collect real identity documents or accept public bookings.

## Executive assessment

The product has a credible one-town MVP: customer search and booking, owner supply management, admin review, server-designed approval gates, private verification evidence, booking lifecycle/history, and useful demo fixtures. The remaining work is concentrated in release engineering and account/privacy operations rather than new marketplace features.

The lowest-hassle route to market is a controlled Android closed pilot. Finish the P0 gates below, invite 10–20 owners and a small customer cohort, and expand only after the booking and review loop works against live infrastructure.

## Evidence gathered

- `npm run typecheck` passes on the current branch.
- `npx expo config --type public` resolves Expo SDK 56, Android package `in.merasaarthi.cabs`, version `1.0.0`, version code `1`, and Android 16 / API 36 compatibility through SDK 56.
- Expo Doctor passes 20 of 22 checks. It reports the SDK 56 Hermes V1 regression and a TypeScript version mismatch. Expo recommends SDK 57 with a compatible React Native patch.
- The installed Node version is 20.19.0 while `package.json` requires at least 20.19.4.
- `npm audit --omit=dev` reports 23 transitive findings in Expo tooling. Its forced suggestion would downgrade Expo and must not be used. Reassess after the supported SDK upgrade.
- No `eas.json`, tracked app icon/splash assets, EAS project ID, or production build profile exists.
- The repository contains five incremental migrations and two Edge Functions. The last documented Production inspection found no migration ledger and the EP-04 verification schema absent.
- The app supports account creation but has no in-app account deletion/request path, external deletion page, privacy-policy link, or configured support destination.
- Demo mode demonstrates the product decisions and state transitions. It cannot prove Supabase RLS, private Storage, signed URLs, physical camera/gallery behavior, Edge Functions, retention scheduling, push delivery, or Android release signing.

## Launch blockers

| Priority | Blocker | Evidence | Required outcome |
|---|---|---|---|
| P0 | No safe account closure | `bookings.customer_id` and `bookings.vehicle_id` use restrictive foreign keys; booking snapshots retain names and trip places; no client deletion route exists | Add a reviewed server-side account-closure workflow that anonymizes retained booking history, queues private evidence for deletion, removes tokens/active supply, deletes the Auth user, and exposes status/errors in app |
| P0 | Privacy and support are unpublished | No privacy/support/deletion links or owner contact are configured | Publish a public privacy policy and external account-deletion page, configure a monitored support destination, and link all three inside the app |
| P0 | Live verification schema is absent/unverified | Five migration files exist, while the documented Production ledger is empty and EP-04 tables/bucket were absent | Create a reproducible baseline, validate all migrations/RLS/Storage in staging, reconcile the Production ledger, then apply during an approved window |
| P0 | No Production administrator | Admin cannot self-register; the approved initial account is recorded outside source control | Implement and review a one-time service-role bootstrap, exercise it in staging, then promote the approved existing account in Production |
| P0 | Retention worker is not operating | Worker source exists, but it is undeployed and unscheduled | Deploy with a dedicated secret, schedule daily, alert on failed/stuck queue items, and prove Storage bytes are actually deleted |
| P0 | Release build is not configured | No EAS project ID/profile, store signing setup, icon/splash, or AAB has been produced | Upgrade the supported toolchain, add reviewed EAS profiles/assets, configure Expo/FCM credentials, and install a signed release candidate on physical Android devices |
| P0 | Store policy inputs are missing | Account creation exists; no deletion or privacy resources; Data Safety answers are undocumented | Complete Play privacy policy, Data Safety, account deletion URL, content rating, app access, store listing, and closed-test requirements |
| P0 | Core integration is unproved | Typecheck/demo pass, but no disposable Supabase + Android end-to-end run is recorded | Pass the release scenario matrix with synthetic data on staging and a signed Android build |
| P1 | Phone ownership/recovery is weak | Phone/password works without SMS; no recovery process exists | Publish a human-assisted recovery and impersonation procedure, or adopt verified phone/email authentication before wider launch |
| P1 | Push is incomplete | Client/Edge Function exist; EAS ID, FCM V1, webhook, receipts, and stale-token cleanup are absent | Configure and validate delivery/tap behavior; add receipt handling if push is launch-critical |
| P1 | Public geocoder has no SLA | Photon remains an unauthenticated public dependency | Retain manual pickup fallback for pilot and set a usage cap/monitor; move to managed or self-hosted search before material traffic |
| P1 | Operational ownership is undefined | No named support/incident/review owners or service targets | Name owners and targets for document review, booking incidents, account recovery, deletion, and retention failures |

## Account deletion defect

The retention migration has a `before delete` trigger on `profiles`, but that trigger is not sufficient for a real account closure:

1. A customer profile with bookings cannot be deleted because `bookings.customer_id` has no delete action.
2. An owner profile cascades to vehicles, but a referenced vehicle cannot be deleted while bookings remain.
3. Booking rows contain customer/owner name snapshots, pickup, and destination. Retaining those unchanged after account deletion would retain identifying data.
4. Deleting only the Auth user can therefore fail or leave more personal data than the user-facing flow promises.

The release implementation needs one privileged transaction that terminates future access and anonymizes retained operational records before deleting relational/Auth identity. The privacy policy must state the narrow retention purpose and period for anonymized booking/audit records.

## Demo coverage verdict

| Scenario | Demonstrated | Production proof still required |
|---|---:|---|
| Pending owner/vehicle cannot receive bookings | Yes | Direct API/RLS bypass attempts |
| Aadhaar + selfie and RC + insurance + PUC review | Yes | Real private upload, signed URL, expiry, replacement, and access matrix |
| Optional driver and vehicle photos | Yes | Camera/gallery permissions, consent withdrawal, customer-only signed access, byte purge |
| Approve/reject with reasons | Yes | Admin authorization and database audit behavior |
| Booking request and terminal states | Yes | Idempotency, overlap concurrency, expiry, and contact release on staging |
| Account/vehicle blocking and history | Yes | Live policies and operator recovery |
| Account closure | No | Full staging lifecycle and public deletion request |
| Retention | No | Scheduled worker, alerts, retry/dead-letter operations |
| Push | Partial UI only | Physical Android, FCM, webhook, delivery receipt behavior |
| Store release | No | Signed AAB, closed track, policy declarations, reviewer access |

## Current external requirements used by the audit

- Google Play requires an in-app account deletion path and a functional web resource when an app allows account creation: <https://support.google.com/googleplay/android-developer/answer/13327111>
- Google Play requires a public privacy policy and accurate Data Safety disclosures: <https://support.google.com/googleplay/android-developer/answer/18258653>
- New Play submissions and updates must target Android 16 / API 36 from 31 Aug 2026: <https://developer.android.com/google/play/requirements/target-sdk>
- Expo SDK 56 targets API 36, but Expo Doctor recommends moving this project to SDK 57 for the current Hermes/React Native compatibility fix: <https://docs.expo.dev/versions/v56.0.0/>
- EAS production and preview values should be kept in explicit build environments: <https://docs.expo.dev/eas/environment-variables/>

## Scope recommendation

Do not start another marketplace epic. Complete a release-hardening epic first. Payments, tracking, ratings, multi-town support, and a web admin would add surface area without resolving the present launch blockers.
