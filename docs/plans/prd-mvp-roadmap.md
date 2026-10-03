# PRD gap review and MVP backlog

**Source:** Attached `Local Cab Booking App — Product Requirements Document (PRD)`, v1.0, 29 Sep 2026.  
**Review date:** 2 Oct 2026.  
**Product constraint:** One Android app, one pilot town, cash only, minimal operating cost. The user's no-SMS phone/password decision overrides the PRD's OTP suggestion for this release.

## Product-owner summary

The implementation pass closes several launch gaps in the app and adds reviewable Supabase migrations plus an Edge Function for booking-request push. The database already has an atomic overlap check for pending and accepted bookings; the migration keeps it and makes expired requests stop blocking slots. Owner approval, completion, status history, price clarity, availability windows, retry feedback, and funnel counts are represented in code. Cloud migrations, push deployment/credentials, and Android device validation remain operator rollout work.

The database already has an atomic overlap check for pending and accepted bookings, and the contact RPCs reveal phone numbers only after acceptance. Preserve both controls while closing the workflow gaps.

## PRD gap matrix

| PRD area | Current implementation | Gap / decision |
|---|---|---|
| Sign-in | Supabase phone/password, no SMS; profile is customer or owner | Deliberate user-approved deviation from OTP. Phone ownership is unverified; define assisted recovery before public launch. |
| Customer local/outstation search | Both modes, vehicle filter, pickup picker, date/time, rates | Pickup autocomplete and optional foreground location exist. Customer distance entry is removed; outstation shows rate/km and driver-confirmed fare. |
| Search results | Available cabs and rate cards, sorted by applicable rate | Sorting and a no-results recovery path are implemented. There is no separate cab-details view; confirmation carries the booking details. |
| Booking creation | Customer requests a cab; database serializes overlapping slots | Request key and double-submit guard are implemented. Pending requests expire after 15 minutes, and the slot check ignores stale requests. A scheduled job is needed for timely status updates while the app is idle. |
| Booking lifecycle | pending, accepted, rejected, cancelled, expired, completed | Owner completion, reasoned cancellation/rejection, server-side transition validation, and actor/time status history are implemented in the migration and app. Apply and validate the migration before cloud use. |
| Owner onboarding/trust | Owner chooses role; vehicle requires registration and admin review | Owner and vehicle states, admin review, registration number, and server-side search/booking gates are implemented. Registration review is manual; there is no document upload/storage flow. |
| Owner availability | Available/unavailable switch plus optional daily hours | Optional India-time windows, last-updated timestamp, stale-state hint, and requested-slot filtering are implemented. Verify against the pilot town/device timezone. |
| Customer/owner contact | Secure contact RPC data exposed only to booking parties after acceptance | Tap-to-call opens the system dialer after acceptance; validate on an Android device. |
| Notifications/connectivity | App polls cloud data every 30 seconds while active; visible refresh retry, request idempotency, owner token registration, notification tap routing, and an Edge Function sender are implemented | Requires EAS project ID, FCM V1 credentials, function deployment, Database Webhook configuration, Android build, and device delivery validation before owners can rely on alerts while the app is closed. |
| Admin | In-app dashboard blocks accounts/vehicles, approves owners/vehicles, and shows weekly event counts | Review queue and pilot funnel are implemented. No configured help contact or dispute workflow. A web panel remains unnecessary for a first pilot. |
| Privacy/safety | Phone hidden until accepted; cash-only flow; reasoned cancellation and no-show report | Human-assisted account recovery and a real stand/help contact are still needed. |
| Analytics/pilot | Search and booking funnel events with weekly admin aggregates | Manually recruit the first 10–20 owners in one town and review acceptance/completion before adding features. |
| Ads/future features | Ads are a placeholder | Ads are secondary for the first six months. Keep ads off confirmation, contact, and error states. Defer payments, maps/navigation, ratings, chat, multi-city, and advanced pricing as the PRD specifies. |

## Roadmap

### Now — make the one-town pilot dependable

1. **Implemented:** tap-to-call after acceptance.
2. **Implemented in code/migration:** owner and vehicle review, registration number, and server-side search/booking gates. Needs application and RLS validation in a disposable Supabase project.
3. **Implemented in code/migration:** 15-minute pending expiry, completed status, cancellation/rejection reasons, status history, and transition checks. Optional Supabase Cron keeps visible expiry status current while all clients are closed.
4. **Implemented in code; rollout incomplete:** server-confirmed booking state, stable request key, double-submit prevention, retry, owner token registration, notification tap routing, and a server-side push sender. EAS/FCM credentials, function/webhook deployment, and Android validation are still required.
5. **Implemented:** outstation results show the driver's saved per-km rate and do not calculate a guessed total from customer-entered distance.

### Next — reduce daily operating friction

6. **Implemented:** optional availability hours, India-time comparison, last-updated display, and stale-state hint.
7. **Implemented:** price sorting and recovery actions that preserve entered search details.
8. **Partially implemented:** cancellation reasons, no-show reporting after pickup time, visible offline/retry handling. A real help action still needs the local stand's support number; recovery remains human-assisted without SMS.
9. **Implemented in code/migration:** non-PII search and booking funnel events with weekly admin aggregates. Pilot recruitment and field validation remain operator work.

### Later — only after marketplace validation

- Web admin panel if the mobile admin workflow slows operations.
- Regional service areas, multiple towns, rich analytics, and local business ads.
- Route maps, automated distance, tracking, payments, ratings, chat, subscriptions, and commission: outside the MVP until usage justifies them.

## Backlog

| ID | Priority | Item | Acceptance criteria | Size / dependency | State |
|---|---|---|---|---|---|
| MS-01 | P0 | Call accepted booking contact | Customer sees **Call driver** only after acceptance; owner sees **Call customer** only after acceptance; tap opens the Android dialer with the number; missing/invalid numbers fail clearly; no `CALL_PHONE` permission and no number exposed earlier. | S / existing secure contact RPC | Implemented; needs device validation |
| MS-02 | P0 | Owner and vehicle approval | Owner has pending/approved/rejected/blocked states; capture registration number; admin reviews and records a decision; only approved owner vehicles are returned by search and can receive requests; direct API/RLS attempts from pending owners fail. | L / schema migration + RLS review | Implemented in app/migration; apply and security-validate before cloud use |
| MS-03 | P0 | Booking expiry and completion | Pending request expires after a configured 15 minutes; expired requests no longer block availability; owner can mark accepted trip complete; customer/owner see terminal status; state history records actor/time; invalid transitions are rejected server-side. | L / schema migration + RLS review | Implemented in app/migration; apply and validate; Cron optional for idle expiry display |
| MS-04 | P0 | Background request alerts and truthful status | Owner receives a push for a new request; tap opens that request; push failure does not alter booking state; app shows pending/expired and an explicit retry/offline state. | L / FCM credentials + server dispatch | Code implemented: token registration, tap routing, gated Edge Function, and webhook instructions; deployment, credentials, and device validation outstanding |
| MS-05 | P0 | Outstation quote without guessed distance | Customer searches with pickup, destination, date, and vehicle type without entering kilometres; result shows owner ₹/km rate; booking says final fare is confirmed with driver; UI never shows a fabricated total. | M / booking fare snapshot decision | Implemented; needs migration application |
| MS-06 | P1 | Availability confidence | Owner can set available now/unavailable and optional hours; customer sees only currently eligible cabs; show last update; stale state has a clear recovery. | M / agree timezone and schedule semantics | Implemented; verify in target-town timezone and Android UI |
| MS-07 | P1 | Search sorting and empty recovery | Default results sort by lowest applicable owner rate; no-result screen suggests a simple next action and preserves search inputs. | S | Implemented |
| MS-08 | P1 | Cancellation, no-show, and help | Both parties can cancel allowed states with a reason; accepted owner cancellations notify customer; help/call-stand contact is visible on a booking. | M / support number and push | Partial: reasons/no-show implemented; customer cancellation push and support contact need operator setup; current push only alerts owners to new requests |
| MS-09 | P1 | Weak-network state | Distinguish offline, retrying, and server-confirmed booking; never show “request sent” before the server confirms; prevent duplicate tap/retry submissions. | M / idempotency design | Implemented; test network interruption and retry behavior on Android |
| MS-10 | P1 | Minimal pilot funnel | Track search, result view, request, accept/reject, expiry, cancel, complete using non-sensitive identifiers; show weekly owner/supply and conversion totals to admin. | M / analytics/privacy decision | Implemented in migration/app; apply and validate data access |
| MS-11 | P2 | Web admin | Admin can approve owners, edit/disable vehicles, inspect/cancel bookings, and view basic counts. | L / separate web deployment | Defer until mobile admin is a bottleneck |

## Product decisions and guardrails

- Keep phone/password and no SMS. The UX must not claim the number is verified; provide a human-assisted recovery/impersonation process before public launch.
- Keep cash-only. Fare text must say estimate or rate clearly; driver and customer agree the final amount directly.
- Do not add live tracking, chat, online payments, route maps, ratings, or multi-city support to unblock MVP.
- Schema, migrations, and authorization changes need security review. Do not deploy them as part of UI work.
- The current app has no web client. Treat admin web as a follow-up, not as a dependency for improving the Android MVP.
