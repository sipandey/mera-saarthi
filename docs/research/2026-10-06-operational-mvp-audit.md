# Mera Saarthi operational MVP audit

**Audit date:** 6 October 2026  
**Scope:** Android client source, local demo, Supabase schema and migrations, RLS/policies, Edge Functions, product documentation, and existing test assets.  
**Method:** Read-only source audit. No tests were added or run, in accordance with `AGENTS.md`. No live Supabase data was changed.  
**Status vocabulary:** `COMPLETE` means the source contains the required behavior and no material source gap was found; it does not imply production deployment. `PARTIAL` means useful behavior exists but an edge, actor, or enforcement layer is missing. `BROKEN` means the current behavior can violate a core invariant. `MISSING` means no implementation was found. `NOT TESTED` means source exists but no automated or recorded end-to-end proof exists. `OUT OF SCOPE` means deliberately excluded from this MVP.

## 1. Executive Verdict

### Decision

Mera Saarthi is **not ready for a real-money or public pilot**. It is ready only for continued synthetic demos and controlled product walkthroughs.

Of the 26 functional capabilities in the requested pilot checklist (excluding the two meta-items “no unresolved P0/P1”), **10/26, or 38%, appear fully complete in source**. Fourteen are partial and two are broken. Giving half credit to partial capabilities produces 65%, but that must not be read as readiness: **0/26 have production end-to-end proof** across a signed Android build and the intended Supabase environment.

The application has a credible shape: customer search, cash-fare explanation, idempotent request attempts, six booking states, owner actions, admin review, rate snapshots, contact gating, booking history, and database overlap locking all exist in source. The release fails the stricter standard in this audit because the marketplace's server-side invariants and live rollout have material gaps.

### Top five blockers

1. **The configured Production backend cannot run the current application flows.** The dated read-only inspection found no migration ledger, no `expired`/`completed` booking states, no verification schema, and no admin account (`docs/research/2026-10-05-ep04-research.md:16-34`). Current `loadCloudData` queries those missing objects on every load (`src/cloudData.ts:17-30`).
2. **One physical vehicle can be registered more than once.** `registration_number` is not unique or normalized (`supabase/migrations/20261001000200_pilot_booking_workflows.sql:20-28`), while overlap locking is only by vehicle row UUID (`supabase/migrations/20261003000100_driver_vehicle_verification_documents.sql:241-247`). Duplicate rows can therefore produce two accepted bookings for the same real cab.
3. **Availability hours are only a client filter.** The app checks the requested time against a daily window (`App.tsx:81-90`), but `is_approved_vehicle` and `check_booking_slot` do not check that window (`supabase/migrations/20261003000100_driver_vehicle_verification_documents.sql:219-249`). A stale or direct client can book outside the owner's declared hours.
4. **Acceptance does not recheck vehicle eligibility.** Owner update RLS checks ownership and active account only (`supabase/migrations/20261001000200_pilot_booking_workflows.sql:419-425`). A pending request can become `accepted` after an admin blocks the vehicle, documents expire or are replaced, approval is reset, or the owner switches availability off.
5. **No automated or recorded integration suite proves the critical controls.** The repository contains no application/database test files. Demo mode cannot prove RLS, Storage privacy, concurrency, expiry, notification delivery, or retry behavior; the documented staging/device run remains open.

### Audit basis and limitations

The requested `docs/PRD.md`, `docs/UX.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, and `docs/BUILD_PLAN.md` are not present. The closest active sources are:

- `docs/product/requirements-and-mvp.md`
- `docs/product/current-state.md`
- `docs/plans/prd-backlog-implementation.md`
- `docs/plans/prd-mvp-roadmap.md`
- `docs/research/stitch-product-review.md` and its HTML/PNG reference
- `App.tsx`, `src/**`, `supabase/schema.sql`, migrations, and Edge Functions

The app has no navigation library; routes are the `page` union in `App.tsx:98` (`auth`, `home`, `search`, `results`, `confirm`, `bookings`, `owner`, `add`, `admin`). The repository has no automated application or SQL tests. The current live-state conclusion relies on the dated, read-only inspection recorded in `docs/research/2026-10-05-ep04-research.md`; it must be rechecked before rollout.

## 2. Customer Flow Map

```text
Open app
  ├─ no session → sign in / create customer account
  │    ├─ invalid/duplicate/network error → Supabase error alert → retry
  │    └─ blocked profile → forced sign-out → admin contact copy
  └─ persisted active session → load server state → Home

Home → choose Local or Outstation → enter pickup → Trip details
  ├─ invalid/past date, invalid time/duration, missing pickup/destination → stay and correct
  ├─ place lookup/location fails → manual pickup remains available
  └─ valid → Results
       ├─ no eligible cab → choose any type or change search
       └─ select eligible cab → Review
            ├─ change details → Search
            └─ send request (guarded tap + request key)
                 ├─ server rejects stale/unavailable/conflicting cab → error → safe retry/search
                 ├─ timeout → same request key retained → retry
                 └─ REQUESTED
                      ├─ owner ACCEPTS → ACCEPTED → driver contact/call → trip
                      │    ├─ customer cancels/no-show → CANCELLED
                      │    └─ owner completes → COMPLETED
                      ├─ owner REJECTS → REJECTED → search again through navigation
                      ├─ no response for 15 minutes → EXPIRED → search again
                      └─ customer cancels → CANCELLED
```

Customer strengths: explicit pending-versus-confirmed copy, cash disclosure, manual pickup fallback, request idempotency, server-confirmed success, terminal statuses, and contact release only after acceptance.

Customer gaps: same pickup/destination is allowed; there is no minimum lead-time decision; accepted details omit registration number; history is one ungrouped “Upcoming” list; rejection/expiry lacks a card-level “search again” action; status updates rely on 30-second polling/reopen; and all cloud behavior is unproved in the target environment.

## 3. Cab Owner Flow Map

```text
Create owner account → PENDING owner
  → add vehicle/rates/registration (vehicle PENDING and unavailable)
  → upload Aadhaar + selfie + RC + insurance + PUC
  → admin reviews documents
       ├─ rejected evidence → owner replaces → review restarts
       └─ approved evidence → admin approves owner, then vehicle
            → owner switches availability on / sets daily hours
                 → receives REQUESTED booking by polling or optional push
                      ├─ accept → ACCEPTED → call customer → complete/cancel/no-show
                      ├─ reject/pass with reason → REJECTED
                      └─ customer cancels / request expires → terminal state on refresh
```

Owner strengths: evidence status, separate owner/vehicle approval, positive rates in the UI, registration-change re-review, availability control, accept/reject/cancel/complete actions, reasons, and server-confirmed mutations.

Owner gaps: duplicate registration is accepted; changing vehicle name/type/seats does not require re-verification; server rate checks allow ₹0; the pending request card omits customer identity; “Today's bookings” is actually every booking; completion is allowed before pickup; mutation failures have no inline retry; and acceptance does not recheck vehicle eligibility.

## 4. Admin Flow Map

```text
Privileged admin provisioning (not implemented/deployed)
  → sign in as admin
  → review latest private evidence
       ├─ reject with reason → owner replaces
       └─ approve evidence → approve owner → approve vehicle
  → monitor owners/customers/vehicles/bookings/history/weekly counts
  → block or unblock account/vehicle
  → investigate stuck or disputed booking from row + status history
  → use a controlled manual correction only under an operator runbook
```

No separate web admin should be built for the first pilot. The existing mobile admin source is sufficient once deployed and verified. The following can remain in Supabase Dashboard for a tightly controlled pilot:

- one-time initial-admin provisioning through a reviewed service-role procedure;
- read-only inspection of profiles, vehicles, bookings, history, and failed purge work;
- weekly aggregate queries;
- emergency block/unblock and carefully logged repair of a stuck booking;
- Storage/retention operations by an authorized operator.

The dashboard is not a substitute for server rules. It must not be used to make routine arbitrary booking transitions, expose evidence URLs, or bypass review. A runbook, named operators, and an audit record are missing. Blocking behavior for already accepted future bookings is undefined.

## 5. Cross-Actor Flow Map

```text
Customer REQUESTED
  ├─ Owner ACCEPTED ─→ contacts released to both parties
  │    ├─ Customer CANCELLED ─→ owner sees state on refresh
  │    ├─ Owner CANCELLED ─→ customer sees state on refresh
  │    └─ Owner COMPLETED ─→ both see terminal state
  ├─ Owner REJECTED ─→ customer sees reason/status on refresh
  ├─ Customer CANCELLED ─→ owner sees state on refresh
  └─ System EXPIRED ─→ both see state after refresh/lazy expiry

Admin changes eligibility
  ├─ block owner → new search/request blocked; existing accepted policy undefined
  ├─ block vehicle → removed from new search/request
  │                  but an already REQUESTED booking can still be accepted (defect)
  └─ reject/replace evidence → new search/request blocked
                     but an already REQUESTED booking can still be accepted (defect)

Owner changes price → existing booking snapshots stay fixed; new requests use new rate
Owner disables availability → new request blocked; accepted booking unchanged;
                              pending-request acceptance semantics are undefined and currently allowed
```

The source does not depend on push as truth: polling/reopen loads the database. That is correct. However, no accepted/rejected/cancelled push exists, and booking-request push is not configured, so “receives” means eventual refresh rather than immediate alert.

## 6. Booking State Machine

The source names the requested `REQUESTED` state `pending`. The table uses product names in uppercase and notes the stored value.

| Current State | Actor | Action | New State | Allowed? | Side Effects |
|---|---|---|---|---|---|
| — | Customer | Create eligible, future, conflict-free request | REQUESTED (`pending`) | Yes | Fare/name/rate snapshot; 15-minute expiry; history and pilot event; idempotency key |
| — | Customer | Repeat same request key | REQUESTED | Yes, idempotent | Unique-key conflict resolves the original booking ID |
| REQUESTED | Owner | Accept | ACCEPTED | Yes | History/event; contact RPCs begin returning phone data |
| REQUESTED | Owner | Reject with supported reason | REJECTED | Yes | History/event; terminal |
| REQUESTED | Customer | Cancel with supported reason | CANCELLED | Yes | History/event; terminal |
| REQUESTED | System | Expiry after 15 minutes | EXPIRED | Yes | `system_expiry`, system actor, history/event; terminal |
| REQUESTED | Owner | Complete | COMPLETED | No | Trigger rejects `pending → completed` |
| REQUESTED | Owner | Accept after vehicle becomes blocked/unapproved/unavailable | ACCEPTED | **Yes today; should be conditional/denied** | Core eligibility defect; no recheck occurs on status-only update |
| ACCEPTED | Customer | Cancel with reason | CANCELLED | Yes | History/event; contact disappears after refresh |
| ACCEPTED | Owner | Cancel with reason | CANCELLED | Yes | History/event; vehicle availability is unchanged |
| ACCEPTED | Customer | Report driver no-show after pickup | CANCELLED | Yes | Reason `driver_no_show`; trigger rejects pre-pickup no-show |
| ACCEPTED | Owner | Report customer no-show after pickup | CANCELLED | Yes | Reason `customer_no_show`; trigger rejects pre-pickup no-show |
| ACCEPTED | Owner | Complete trip | COMPLETED | Yes | History/event; currently allowed even before pickup |
| ACCEPTED | Owner | Reject | REJECTED | No | Trigger rejects |
| REJECTED | Customer/Owner | Any transition | — | No | Terminal under normal RLS/trigger path |
| EXPIRED | Customer/Owner | Any transition | — | No | Terminal under normal RLS/trigger path |
| CANCELLED | Customer/Owner | Any transition | — | No | Terminal under normal RLS/trigger path |
| COMPLETED | Customer/Owner | Any transition | — | No | Terminal under normal RLS/trigger path |
| Any | Admin through direct table update | Change status or immutable booking fields | Any enum state | **Backend allows; app does not expose full override** | `protect_booking_fields` returns early for admin; correction policy/audit reason is not defined |

Database enforcement lives in `supabase/migrations/20261001000200_pilot_booking_workflows.sql:196-245`; RLS actor permissions are at lines 410-430; history is at lines 50-78 and 109-140. Missing rules are acceptance-time eligibility, completion-after-pickup, admin override constraints, and a defined effect on availability after cancellation/completion.

## 7. Actor Flow Matrix

`Tested?` distinguishes demo coverage from automated/integration proof. There are no automated tests.

| ID | Actor | Flow | Happy Path | Edge Cases Covered | Implemented? | Tested? | Priority |
|---|---|---|---|---|---|---|---|
| C1 | Customer | Onboarding/auth | Phone/password signup, signin, signout, persisted session | Validation, Supabase errors, blocked signout | PARTIAL — no recovery; raw errors; live config unproved | Demo entry only; no auth E2E | P1 |
| C2 | Customer | Home | Choose Local/Outstation and pickup | Empty inventory; sync retry banner | PARTIAL — existing trip not surfaced on Home | Demo only | P2 |
| C3 | Customer | Local search | Pickup/date/time/hours/type | Missing/past/invalid/no results; manual pickup | PARTIAL — no lead-time rule; server ignores hours window | Demo only | P0 |
| C4 | Customer | Outstation search | From/pickup, destination, date, type | Missing fields/no results/network fallback | PARTIAL — same From/To allowed; duration semantics unclear | Demo only | P1 |
| C5 | Customer | Cab selection | Shows eligible cab, owner, type, seats, rate, verified/available | One/many/none; stale insert fails server-side | COMPLETE in source | Demo only; RLS not tested | P0 |
| C6 | Customer | Booking review | Trip, cab, date/time, pickup/destination/duration/rate/cash | Submit disabled in flight | COMPLETE in source | Demo only | P0 |
| C7 | Customer | Request | Server-confirmed `pending` | Stable request key, duplicate tap, timeout retry, stale cab error | COMPLETE in source | No network/integration test | P0 |
| C8 | Customer | Accepted booking | Confirmed state, driver name/phone, vehicle, time, fare/rate, cash | Missing phone fallback; system dialer | PARTIAL — registration number absent | Demo only; dialer/RPC not tested | P1 |
| C9 | Customer | Rejected booking | Rejected state/reason | Search reachable via nav | COMPLETE in source | Demo only | P1 |
| C10 | Customer | Expired booking | 15-minute lazy expiry and terminal state | Reopen/refresh; stale pending excluded from conflicts | COMPLETE in source | No scheduler/database test | P0 |
| C11 | Customer | Cancellation | Pending/accepted → cancelled with reason | Repeat tap becomes failed/no-op; no-show timing | COMPLETE in source | Demo only | P0 |
| C12 | Customer | Booking history | Customer RLS returns own bookings | All terminal states shown | PARTIAL — single list labelled Upcoming; no grouping/archive | RLS not tested | P1 |
| C13 | Customer | Driver contact | Phone only after accepted; tap opens dialer | Missing/invalid phone fallback | COMPLETE in source | Demo only; RLS/dialer not tested | P0 |
| O1 | Owner | Registration | Owner account then vehicle/rates/evidence | Missing/negative rates blocked in UI | PARTIAL — duplicate registration and server-side ₹0 allowed | No auth/database test | P0 |
| O2 | Owner | Verification | Pending/rejected/approved owner and documents | Replacement, expiry, rejection reason | PARTIAL — source complete; target backend missing | Demo only | P0 |
| O3 | Owner | Vehicle management | Add/edit details, rates, hours, evidence | Registration change resets approval | PARTIAL — name/type/seats changes do not re-verify; duplicates allowed | Demo only | P0 |
| O4 | Owner | Rate management | Hourly/full-day/per-km; snapshot at request | UI blocks non-positive; snapshot protects old booking | PARTIAL — DB permits zero/no ceiling; no range decision | Demo only; snapshot not tested | P1 |
| O5 | Owner | Availability | Toggle and daily hours | Invalid/overnight range rejected; stale marker | BROKEN — declared hours not server-enforced | Demo only | P0 |
| O6 | Owner | Receive request | Pickup, trip/destination, date/time, cash/rate | Multiple/expired/cancelled visible | PARTIAL — pending card omits customer name; push unconfigured | Demo only | P1 |
| O7 | Owner | Accept | Pending → accepted | Per-row overlapping requests blocked at creation | BROKEN — no eligibility recheck; duplicate vehicle rows bypass physical-cab lock | No concurrency test | P0 |
| O8 | Owner | Reject/pass | Pending → rejected with reason | Confirmation/reason chooser | COMPLETE in source | Demo only | P0 |
| O9 | Owner | Cancel | Accepted → cancelled with reason | Server confirmation; availability unchanged | COMPLETE in source | Demo only | P1 |
| O10 | Owner | Today's bookings | List request details/actions | Empty/one/many/terminal shown | PARTIAL — list is all dates/statuses, not Today/upcoming | Demo only | P1 |
| O11 | Owner | Complete trip | Accepted → completed | Invalid requested → completed rejected | PARTIAL — completion allowed before pickup | Demo only | P1 |
| O12 | Owner | Network failure | No success before server confirmation | Alerts on mutation failure; refresh retry | PARTIAL — status actions have no retained retry affordance | No offline/device test | P1 |
| A1 | Admin | Owner verification | Review files, approve/reject owner | Current/latest evidence and reason | PARTIAL — source exists; no live schema/admin | Demo only | P0 |
| A2 | Admin | Owner management | Inspect, block/unblock, associated vehicles/bookings | Block resets vehicles unavailable/pending | PARTIAL — existing accepted bookings undefined | Demo only | P1 |
| A3 | Admin | Vehicle management | Review/approve/reject/block | Disabled removed from new search/request | PARTIAL — already-requested booking can still be accepted | Demo only | P0 |
| A4 | Admin | Customer management | Find, inspect count/bookings, block/unblock | Block prevents active API access | COMPLETE in source | RLS not tested | P0 |
| A5 | Admin | Booking operations | Inspect parties/trip/status/history | Manual Dashboard intervention possible | PARTIAL — UI omits booking ID; override policy is undefined/over-broad | Demo only | P1 |
| A6 | Admin | Dispute/support | History/reasons support manual investigation | Stuck/duplicate/no-show can be inspected | PARTIAL — no support destination or runbook | Not tested | P1 |
| X1 | Cross | Request → accept → confirmation | State/contact converge via refresh | Push failure does not alter state | PARTIAL — no configured immediate notification | Demo only | P1 |
| X2 | Cross | Request → reject → retry | Rejection visible; search remains reachable | Reason recorded | COMPLETE in source | Demo only | P1 |
| X3 | Cross | Request → no response → expire | 15-minute expiry; slot released | Lazy refresh; optional cron | COMPLETE in source | No expiry integration test | P0 |
| X4 | Cross | Customer cancels pending | Owner sees cancelled on refresh | Reason/history | COMPLETE in source | Demo only | P1 |
| X5 | Cross | Customer cancels accepted | Owner sees cancelled on refresh | Contact removed on reload | COMPLETE in source | Demo only | P1 |
| X6 | Cross | Owner cancels accepted | Customer sees cancelled on refresh | Reason/history | COMPLETE in source | Demo only | P1 |
| X7 | Cross | Accepted → trip → completed | Both see completed | Invalid requested → completed denied | PARTIAL — no pickup-time guard | Demo only | P1 |
| X8 | Cross | Competing customers | Advisory lock rejects overlapping active request | Stale pending ignored | BROKEN at physical-cab level because duplicate registrations are allowed | No concurrency test | P0 |
| X9 | Cross | Rate changes | Existing snapshot fixed; new booking uses new rate | Local/outstation snapshots | COMPLETE in source | Not tested | P0 |
| X10 | Cross | Owner becomes unavailable | Existing accepted remains; new request denied | Pending semantics currently allow accept | PARTIAL — decision/enforcement missing | Not tested | P0 |
| X11 | Cross | Admin blocks owner | New activity denied; vehicles reset | — | PARTIAL — accepted future booking handling undefined | Not tested | P1 |
| X12 | Cross | Admin disables vehicle | Removed from listing/new request | — | PARTIAL — pending request still accept-capable | Not tested | P0 |

### MVP coverage matrix

| Requirement | Coverage | Evidence | Verdict |
|---|---|---|---|
| Access/onboarding | Auth client, profile trigger, blocked-user signout | `App.tsx:145-178,463-491`; `supabase/schema.sql:18-32` | PARTIAL |
| Local hire | UI fields, quote, booking snapshot | `src/screens/CustomerScreens.tsx:72-97`; workflow migration `142-163` | PARTIAL |
| Outstation | Destination, date/type, per-km snapshot | `CustomerScreens.tsx:89-93`; `BookingConfirmation.tsx:48-52` | PARTIAL |
| Eligible cab discovery | Approval/document-filtered view and booking gate | verification migration `219-262` | PARTIAL — not deployed/proved |
| Idempotent request | In-flight guard and unique request key | `App.tsx:279-313`; `src/cloudData.ts:150-172`; workflow `34-39` | COMPLETE in source |
| Conflict safety | Advisory lock/range overlap | verification migration `234-249` | BROKEN for duplicate physical vehicle rows |
| Booking lifecycle | Six states, transition trigger, expiry/history | workflow migration `50-78,109-140,196-245,322-337` | PARTIAL |
| Contact privacy | Post-acceptance contact RPCs | `supabase/schema.sql:168-192`; `BookingCard.tsx:70-102` | COMPLETE in source, NOT TESTED |
| Rate integrity | Trigger-calculated local fare and per-km snapshot | workflow migration `142-163,196-218` | COMPLETE in source |
| Owner/vehicle verification | Private evidence, review and currentness | verification migration `3-141,219-262` | PARTIAL — rollout missing |
| Availability | Toggle/daily hours and client search filter | `App.tsx:81-90,355-365`; workflow `20-28` | BROKEN — backend time rule missing |
| Admin operations | Mobile admin + RLS/admin policies/history | `src/screens/AdminScreen.tsx`; workflow `50-74` | PARTIAL |
| Notifications | Optional owner push; DB remains truth | `src/pushNotifications.ts`; Edge Function | PARTIAL — infrastructure unconfigured |
| Weak connectivity | Manual location, request retry, refresh banner | `LocationPicker.tsx:52-158`; `App.tsx:225-249,279-313,539-540` | PARTIAL |
| Automated verification | — | No `*.test.*`, `*.spec.*`, SQL test harness, or test script | MISSING |
| Payments/wallet/coupons/ratings/chat/live GPS/auto-match/surge | Explicitly excluded | `docs/product/requirements-and-mvp.md` | OUT OF SCOPE |

## 8. Edge Case Matrix

| Category | Case | Current behavior | Gap / priority |
|---|---|---|---|
| Authentication | Duplicate account / invalid credentials | Supabase error shown | Raw/non-actionable copy; NOT TESTED / P1 |
| Authentication | Persisted/expired session | AsyncStorage + auto refresh; auth listener returns to login | Expiry/revocation not tested / P1 |
| Authentication | Blocked user | Profile load/refresh signs out; RLS uses active user | Existing accepted booking policy/support undefined / P1 |
| Authentication | Recovery/impersonation | No flow | Human process missing / P1 |
| Search | Missing/past/invalid input | UI blocks | Server only validates future pickup and positive duration / P1 |
| Search | Same origin/destination | Allowed | Missing validation/decision / P1 |
| Search | Very near departure | Any future minute allowed | Minimum lead time undefined / P1 |
| Search | Geocoder/offline | Manual text remains | Good source behavior; device test missing / P1 |
| Availability | Changed after results | Insert gate rechecks base eligibility | Safe for availability switch; user sees raw error / P1 |
| Availability | Outside owner hours | Client hides; direct/stale insert succeeds | Missing backend rule / **P0** |
| Availability | Owner off after request | Pending can still be accepted | Decision and acceptance guard missing / **P0** |
| Booking | Duplicate taps/retry | In-flight ref + stable unique request key | Good source behavior; network test missing / P0 proof |
| Booking | App closes after request | Booking loads from server on reopen | Good source behavior; integration test missing / P0 proof |
| Booking | Request expiry | Lazy RPC after 15 minutes; stale row no longer blocks | Optional cron only affects timeliness / P1 |
| Concurrency | Two requests same vehicle row | Advisory lock rejects second overlapping pending request | Good design; no concurrency test / P0 proof |
| Concurrency | Same real cab under duplicate rows | Both can be booked | Registration uniqueness missing / **P0** |
| Concurrency | Accept versus customer cancel | Row update/RLS should permit one ordered outcome | No race test; error is generic / P0 proof |
| Concurrency | Accept after admin disables vehicle | Acceptance succeeds | Eligibility recheck missing / **P0** |
| Cancellation | Customer/owner cancel | Supported reasons; server-confirmed | No immediate counterpart push; availability effect implicit / P1 |
| Cancellation | Repeated taps | Later mutation fails/no-ops after refresh | Buttons are not disabled during status mutation / P1 |
| Pricing | Rate changed after request | Snapshot remains immutable | Complete in source; test missing / P0 proof |
| Pricing | ₹0/negative/extreme/decimal | UI blocks ≤0; DB allows 0, blocks negative, allows large decimals | Server range policy incomplete / P1 |
| Notifications | Permission denied/token invalid/delay | Booking state unaffected; reopen/poll is truth | Token receipt/stale cleanup and lifecycle pushes absent / P1 |
| Network | Request timeout | Same idempotency key retry | Good source behavior; no device test / P0 proof |
| Network | Accept/cancel/complete failure | Error alert; no false success | No retained retry or pending-action state / P1 |
| Time | Device timezone differs | Client constructs local device time; DB stores UTC | Pilot assumes India timezone but does not enforce it / P1 |
| Time | Midnight/overnight/full day | Overnight availability disallowed; ≥8h is full day | Cross-midnight request/window semantics untested / P1 |
| Data | Missing phone | Graceful fallback | Good source behavior / P1 proof |
| Data | Deleted/deactivated linked data | Restrictive booking FKs preserve rows | Account closure fails and snapshots retain identity/place data / **P0 before real identity collection** |
| Admin | Block owner/customer/vehicle | New active activity fails closed | Existing accepted booking handling undefined / P1 |
| Admin | Stuck/duplicate/dispute | Can inspect row/history; Dashboard can intervene | No runbook, support contact, or constrained override / P1 |

## 9. MVP Gaps

### Product gaps — missing decisions

- What happens to future `ACCEPTED` bookings when an owner is blocked or a vehicle is disabled?
- Does switching availability off mean “no new requests” while existing pending requests remain accept-capable, or must pending requests be cancelled/rejected?
- What minimum lead time is acceptable for same-day bookings?
- What makes two outstation locations “the same” when both are free text?
- Which vehicle edits require re-verification beyond registration number?
- What are valid rate ceilings/precision and the full-day package definition?
- Who owns support, account recovery, verification review, expiry monitoring, and incident resolution?
- Is an admin booking override required? If yes, which transitions, reasons, and audit fields are permitted?

### UX gaps — missing or misleading interaction

- Accepted customer card omits vehicle registration number.
- Pending owner request omits customer name, even though it is stored.
- Customer history is labelled “Upcoming” but mixes all states and dates.
- Owner “Today” area and booking list include all dates/statuses.
- Rejected/expired cards have no direct “search again” recovery action.
- Status mutations use modal errors without an inline retry/progress state.
- Admin booking rows do not visibly show booking ID.
- No real help/support destination or recovery route is exposed.

### Engineering gaps — missing implementation

- No normalized unique vehicle-registration key.
- No server-side requested-slot check against availability hours.
- No eligibility recheck on `pending → accepted`.
- No server rule preventing completion before pickup.
- No account-closure/anonymization workflow; existing FKs can block deletion.
- No configured/deployed push delivery, receipts, or stale-token cleanup.
- No deterministic lifecycle notification other than polling/reopen.

### Security gaps — missing backend rule or rollout proof

- Production lacks the current migration chain and admin according to the latest recorded inspection.
- RLS, signed Storage URLs, direct API bypass, contact privacy, and display-photo isolation are not verified in staging.
- Admin bypasses all booking field/transition protection in `protect_booking_fields`, without a constrained correction RPC or mandatory reason.
- Raw Aadhaar/vehicle evidence retention worker is not deployed/scheduled; privacy/legal approval is outstanding.
- Account deletion can leave identifying booking snapshots and cannot reliably delete referenced profiles/vehicles.

### Test gaps — missing tests

- No unit tests for fare, time parsing, availability, document currentness, or status UI.
- No SQL/RLS tests for cross-customer reads, blocked actors, private evidence, or contact RPCs.
- No concurrency tests for competing requests, accept/cancel races, expiry, or duplicate registration.
- No idempotency tests for timeout-after-insert and duplicate taps.
- No Android device tests for offline recovery, camera/file picker, dialer, notification permission, token delivery, or timezone changes.
- No end-to-end customer → owner → admin scenario against a disposable Supabase project.

## 10. Prioritized Backlog

### P0 — Blockers

| Item | Problem | Actor affected | Expected behavior | Acceptance criteria |
|---|---|---|---|---|
| P0-1 | Current schema is not reproducibly deployed | All | Target environment matches tracked schema/migrations and has an authorized admin | Baseline reconciled; migrations applied in staging then approved target; schema ledger present; initial admin provisioned; app loads for all roles |
| P0-2 | Duplicate registrations can double-book one physical cab | Customer, Owner, Admin | One active vehicle identity per normalized registration | Canonical registration column/index is unique; duplicate create/update rejected; existing duplicates resolved; overlap test covers the real vehicle identity |
| P0-3 | Availability hours are client-only | Customer, Owner | A request outside declared India-time hours is rejected by PostgreSQL | Insert/RPC computes India-local slot, including duration; direct API bypass fails; boundary/midnight cases specified and tested |
| P0-4 | Disabled/ineligible vehicle can accept a pending request | Customer, Owner, Admin | Acceptance rechecks owner, vehicle, documents, block state, availability, and slot | Atomic acceptance RPC/trigger rejects stale eligibility; customer sees recoverable rejected/cancelled outcome; block/expiry/unavailable race tests pass |
| P0-5 | Critical RLS/lifecycle/concurrency behavior is unproved | All | Source invariants are demonstrated against disposable Supabase and Android | Automated SQL/API tests cover isolation, contact release, invalid transitions, idempotency and races; signed Android E2E passes |
| P0-6 | Real identity evidence has no safe live lifecycle | Owner, Admin | Evidence collection has notice, retention, purge, closure, and incident ownership | Retention approved; worker deployed/scheduled/monitored; account closure anonymizes retained booking data and deletes identity/evidence; staging proof recorded |

### P1 — Before Pilot

| Item | Problem | Actor affected | Expected behavior | Acceptance criteria |
|---|---|---|---|---|
| P1-1 | Accepted details omit registration | Customer | Confirmed trip shows registration and all agreed details | Accepted card displays snapshotted registration; historical booking does not change after vehicle edit |
| P1-2 | Request/booking lists are not operationally grouped | Customer, Owner | Customer sees upcoming/history; owner sees today/upcoming/history | Clear sections; deterministic date/status filters; empty states; cancelled/completed retained |
| P1-3 | Pending owner card omits customer identity | Owner | Owner can identify the requesting customer without exposing phone early | Customer name shown in pending request; phone remains gated until accepted |
| P1-4 | Booking time rules are ambiguous | Customer, Owner | Same-place, minimum lead time, completion timing, and timezone rules are deterministic | Product rules documented; client and server agree; completion before pickup fails |
| P1-5 | Rate and vehicle data constraints are weak | Owner, Customer | Invalid operational data never reaches listings | DB requires positive bounded rates, valid seats, normalized registration; critical edits reset review as decided |
| P1-6 | Block/cancel availability outcomes are undefined | All | Existing accepted/pending trips have a documented deterministic outcome | Runbook and server behavior cover owner/customer/vehicle blocks and cancellations; both parties can see the result |
| P1-7 | Status delivery is eventual and unconfigured | Customer, Owner | Reopen always shows truth; pilot has a reliable alert/fallback process | Poll/reopen device-tested; owner request alert configured or stand fallback documented; push failure drills pass |
| P1-8 | No support/recovery operating model | Customer, Owner, Admin | Users can reach a monitored human for recovery/incidents | Support contact in app; named owner/SLA; account recovery and impersonation runbooks exercised |

### P2 — After Pilot

| Item | Problem | Actor affected | Expected behavior | Acceptance criteria |
|---|---|---|---|---|
| P2-1 | No richer service-area constraint | Customer, Admin | Add only if out-of-area demand becomes operational noise | Pilot data demonstrates need; manual location remains fallback |
| P2-2 | Mobile admin may become slow at volume | Admin | Build web admin only after measured queue bottleneck | Review volume/time threshold exceeded and access/audit design approved |
| P2-3 | Notification lifecycle is basic | Owner | Add receipts/stale-token cleanup if missed requests are material | Miss rate measured; cleanup/receipt monitoring reduces it |
| P2-4 | Analytics have counts but no thresholds | Product/Admin | Pilot decisions use agreed funnel targets | Targets set before expansion; data remains non-PII |

### P3 — Future

| Item | Problem | Actor affected | Expected behavior | Acceptance criteria |
|---|---|---|---|---|
| P3-1 | Online payment | All | Do not build for pilot | Reconsider only after cash workflow and unit economics are proven |
| P3-2 | Live GPS/maps/automatic distance | Customer, Owner | Do not build for pilot | Reconsider only if verified pickup + calling fails materially |
| P3-3 | Ratings/chat/loyalty/coupons/surge | All | Do not build for pilot | New evidence-backed product decision required |
| P3-4 | Automatic matching/multi-town dispatch | All | Do not build for pilot | One-town manual marketplace must first operate reliably |

## 11. MVP Scope Recommendation

### KEEP

- Android-first, one-town, cash-directly-to-driver model.
- Phone/password authentication for the controlled pilot, with an explicit human recovery process.
- Manual/suggested pickup without a mandatory map.
- Local hourly/full-day and outstation per-km pricing with booking-time snapshots.
- Manual owner/vehicle verification and server-enforced eligibility.
- Six-state booking lifecycle, expiry, reasons, audit history, and post-acceptance calling.
- Existing mobile admin; Supabase Dashboard for privileged bootstrap, inspection, and exceptional intervention.
- Poll/reopen as the source-of-truth path; push only as a best-effort alert.

### CUT

- Optional driver/vehicle display photos from the pilot critical path; keep them non-gating or disable until privacy operations are proven.
- Ad placeholder from pilot success criteria.
- A custom web admin and sophisticated in-app analytics dashboard; Dashboard queries are enough initially.
- Any claim of verified phone ownership while SMS/email verification is intentionally absent.

### DEFER

- Online payments, wallets, commissions, coupons, subscriptions.
- Ratings/reviews, chat, loyalty, surge pricing.
- Live tracking, routing, automatic distance/fare calculation, complex maps.
- Automatic matching, waitlists, multi-town/service-area expansion.
- Advanced notification orchestration beyond reliable request alerts and database truth.

## 12. Pilot Readiness Checklist

```text
[ ] Customer can register/login                 (source partial; live E2E absent)
[ ] Owner can register                          (source partial; live E2E absent)
[ ] Admin can approve owner                     (source exists; no live schema/admin)
[ ] Owner can configure vehicle/rates           (duplicate/zero-rate backend gaps)
[ ] Owner can become available                  (source exists; server hours gap)
[x] Customer can search Local Hire              (source/demo)
[ ] Customer can search Outstation              (same-place/time semantics incomplete)
[ ] Customer can see eligible cabs              (source exists; RLS/live not proved)
[x] Customer can request booking                (source/demo, idempotent design)
[ ] Owner receives request                      (polling source; push/live absent)
[ ] Owner can accept                            (eligibility race is unsafe)
[x] Owner can reject/pass                       (source/demo)
[x] Customer sees confirmed booking             (source/demo via refresh)
[x] Customer can call owner                     (complete in source; live RPC/dialer unproved)
[x] Customer can cancel                         (source/demo)
[x] Owner can cancel                            (source/demo)
[ ] Owner can complete trip                     (completion allowed before pickup)
[ ] Booking history works                       (visible but ungrouped; RLS unproved)
[x] Booking expiry works                        (source/lazy design; no live proof)
[ ] Double booking is prevented                 (per-row lock; duplicate physical cab gap)
[x] Rate changes do not alter existing bookings (database snapshot source)
[ ] Blocked users cannot transact                (new activity blocked; accepted handling undefined)
[ ] Disabled vehicles cannot be booked          (new request blocked; pending can still be accepted)
[ ] RLS prevents cross-user access              (policies exist; no integration/bypass proof)
[x] Notification failure does not corrupt booking state
[ ] Offline/network errors recover gracefully   (request retry source; device test absent)
[ ] No unresolved P0 defects
[ ] No unresolved P1 defects
```

# NOT PILOT READY

The exact reasons are: the intended live schema/admin are not deployed and proven; duplicate vehicle identities can defeat physical-cab conflict protection; availability hours are not enforced by the backend; acceptance can succeed after supply becomes ineligible; no RLS/concurrency/end-to-end suite validates the marketplace; and real identity-document retention/account closure operations are not safe enough for live collection. Resolve P0-1 through P0-6 before inviting real customers or collecting real Aadhaar/vehicle evidence. P1 items may be closed either in product or by an explicit, tested pilot runbook, but they cannot remain ambiguous.
