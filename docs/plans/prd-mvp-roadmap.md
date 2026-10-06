# Mera Saarthi — MVP scope and roadmap

**Snapshot:** 6 Oct 2026
**Product:** Android-first local cab booking for a single Indian pilot town
**Primary spec:** [Requirements and MVP scope](../product/requirements-and-mvp.md)
**Current code map:** [Current application map](../product/current-state.md)
**Detailed backlog:** [Epics and stories](prd-backlog-implementation.md)

## Product objective

Prove a reliable, trusted booking loop between local customers, approved owner-drivers, approved vehicles, and a stand administrator. The initial release optimizes for cash fares, Hindi/English usability, manual trust review, low operating cost, and a clear human fallback.

This roadmap is the current product scope. The earlier gap review references an external PRD v1.0 (29 Sep 2026), which is not present in this repository. See [product handoff](../product/README.md) before reconciling additional source requirements.

## Requirements crosswalk

| Requirement | MVP outcome | Epic/story mapping | Current state |
|---|---|---|---|
| RQ-01 Access and safe onboarding | Customer/owner phone-password sign-in; admin is provisioned separately; demo is synthetic and local | EP-01 · MS-14, MS-15 | App code exists; auth project settings and human recovery remain rollout/operator work |
| RQ-02 Find a suitable cab | Local/outstation modes, manual or suggested pickup, vehicle filter, requested date/time, eligibility-filtered results | EP-02 · MS-05, MS-07, MS-16 | Implemented in app; Photon and Android permission paths need field validation |
| RQ-03 Honest fare | Local rate/estimate is explicit; outstation displays saved per-km rate and driver-confirmed final fare | EP-02 · MS-05 | Implemented in code/migrations |
| RQ-04 Reliable request | Server-confirmed idempotent booking; no conflicting slot; pending requests expire after 15 minutes; valid transitions and history | EP-03 · MS-01, MS-03, MS-09 | Code/migrations exist; cloud and Android integration remain unverified |
| RQ-05 Release contact safely | Customer/owner phone access only after booking acceptance; system dialer handles the call | EP-03 · MS-01 | Implemented in base schema/app; validate on Android and against cloud RLS |
| RQ-06 Approve real supply | Required driver and vehicle files are privately stored and individually reviewed; owner and vehicle approvals are separate; latest valid evidence gates search/booking | EP-04 · MS-02, MS-12 | Client and local retention worker implemented; configured Production project lacks verification schema/Storage and migration history; policy review and isolated security validation remain open |
| RQ-07 Improve listing trust without blocking supply | Owner can opt in to show approved selfie; optional vehicle photo gets its own admin review; neither photo is an eligibility requirement | EP-04 · MS-13 | Client supports opt-in, review, and vehicle-photo withdrawal; Production photo migration/policies are absent and signed-link flow remains unverified |
| RQ-08 Run the stand | Availability windows, requests, account/vehicle blocks, document review, booking state/history, and weekly counts | EP-05 · MS-06, MS-08, MS-10 | Mobile admin/owner flows and admin booking-history timeline implemented; support contact and operational procedures are missing |
| RQ-09 Keep service practical on pilot network | Manual pickup fallback, server-confirmed request, guarded retry, visible refresh recovery, optional best-effort push | EP-06 · MS-04, MS-09, MS-16 | Partial: core paths exist; no clear full offline mode; push deployment/device validation outstanding |
| RQ-10 Learn before expanding | Privacy-limited weekly counts support a small town pilot; no unvalidated expansion features | EP-07 · MS-10, MS-11 | Event functions exist; no agreed success thresholds or field data yet |

## Roadmap

The plan is milestone-based; delivery dates and pilot thresholds have not been agreed. Use the story status in the [detailed backlog](prd-backlog-implementation.md), not the roadmap phase heading, to distinguish code from rollout.

### Current priority — EP-08 market readiness

Pause feature expansion and execute the [EP-08 market-readiness plan](2026-10-06-market-readiness-plan.md). It owns release builds, privacy/help links, safe account closure, reproducible migrations, initial-admin provisioning, retention operations, staging/device validation, and the Play closed pilot. These are P0 release gates for the already implemented MVP.

### Phase 0 — pilot release gates (P0)

**Goal:** a real customer request can be made only for approved supply, without exposing identity data or misrepresenting booking status.

- Review the base schema and all timestamped migrations; apply them to a disposable Supabase project in order.
- Validate RLS, document upload/review, customer display-photo opt-in, signed-link access, stale/expired documents, owner blocks, vehicle blocks, and attempted API bypasses using customer, pending owner, approved owner, blocked user, and admin accounts.
- Exercise request, accept/reject/cancel/expire/complete transitions and overlapping-slot concurrency; confirm phone access only after acceptance.
- Validate pickup fallback, fares, booking confirmation/retry, expiry, and dialer on the supported Android build.
- Provision the initial admin, set Supabase Auth phone confirmation deliberately (currently disabled to avoid SMS), define human account recovery and stand support contact, and approve/deploy the evidence retention worker.
- If launch depends on background booking alerts, configure EAS project ID, FCM V1, Edge Function secrets/deployment, Database Webhook, and verify delivery/tap routing on an installed build. Push remains best-effort.

**Exit:** all P0 stories pass on a disposable cloud project and Android device; owner/vehicle booking gates are server-enforced; operators can process a failed/rejected verification and a failed booking without claiming success prematurely. Product owner sets minimum conversion/response thresholds before recruiting beyond the first 10–20 owners.

### Phase 1 — pilot operations (P1)

**Goal:** learn whether the single-town flow is understandable and operationally sustainable.

- Recruit a small group of local owners and customers; review weekly search → results → booking, response, expiry, cancellation, and completion counts.
- Validate availability-window semantics and stale-availability handling with operators in the actual town/timezone.
- Add the agreed help/support contact and incident handling. Observe network failures and improve recovery only from pilot evidence.
- Define administrative owner identity/RC checking procedure, account recovery, and photo moderation policy; monitor the deployed evidence purge schedule.
- Review opt-in rates, rejected documents, photo consent, support reasons, owner response time, and completion feedback; keep metrics free of sensitive trip data.

**Exit:** the product owner has reviewed real pilot evidence and documented which bottleneck justifies the next feature. Do not assume growth from demo behavior.

### Phase 2 — expansion only after validation (P2)

- Separate web admin if mobile review volume becomes a measured bottleneck.
- Multi-town service areas, localized ads, richer analytics, automated distance/routing, or map/tracking only when the target operating model requires them.
- Online payments, chat, ratings, subscriptions, commission, and automated dispatch remain deferred until safety, operational ownership, and unit economics are explicit.

## Scope controls

- In scope: Android-first one-town booking, cash-only, phone/password without SMS, bilingual core flow, manual owner/vehicle review, approved display photos, basic admin, and privacy-limited pilot counts.
- Not a release requirement: web admin, card/UPI payment, route map, live tracking, chat, ratings, multi-town support, automated pricing, or customer/driver phone-number verification.
- Schema, RLS, Storage policies, authentication, and notification configuration need maintainer review. App-only gating must never replace database enforcement.
- Do not infer cloud deployment from a migration filename. The 5 Oct 2026 read-only Production snapshot is documented in [EP-04 research](../research/2026-10-05-ep04-research.md); re-inspect the target project before any future rollout.

## Product decisions retained

- Cash only; local price follows hourly/full-day rules; outstation is a rate, not a fabricated trip total.
- Driver selfie is required evidence but display is a separate opt-in. A vehicle image is optional. Photos display only after admin approval and only for eligible bookable listings.
- Aadhaar is file evidence, not a stored UID; RC/insurance/PUC and identity files remain private.
- Text pickup and optional foreground location; no map dependency in the MVP booking flow.
- System dialer after acceptance; push failure never changes booking state.
- Keep demo synthetic, local, and behaviorally useful; never present demo files as authentic.
