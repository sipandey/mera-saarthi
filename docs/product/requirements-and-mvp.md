# Requirements and MVP scope

**Snapshot:** 5 Oct 2026  
**Market assumption:** one Indian pilot town, locally operated cab stand  
**Primary client:** Android app  
**Payment:** cash directly between customer and driver  
**Authentication:** phone and password; no SMS/OTP in the current MVP decision

## Product outcome

Help a customer find and request an available local cab, help an approved driver respond, and let a stand administrator operate the supply safely. The system must not list or book a driver/vehicle until the required identity and vehicle evidence has been approved. The first release favors clear fares, human contact, and a small operating footprint over automation or feature breadth.

## Users and jobs

| User | Job to be done | Success condition |
|---|---|---|
| Customer | Find a suitable local or outstation cab for a pickup and time, then request it | Sees an eligible cab and clear rate, receives server-confirmed booking state, and gets contact access only after acceptance |
| Driver / vehicle owner | Register, submit identity and vehicle evidence, set rates and availability, respond to requests | Understands review status, can correct rejected evidence, and only receives requests for approved available vehicles |
| Stand administrator | Check documents, approve or reject drivers and individual vehicles, handle bookings and block unsafe accounts | Ineligible supply cannot be booked even if a client bypasses the UI; decisions are reviewable |
| Product/operator | Configure the pilot and learn whether local supply converts into completed rides | Can see weekly funnel counts and operate without relying on an undeployed service |

## MVP requirements

### Customer booking

- Offer local hire by hour/full day and outstation hire by the driver's saved one-way ₹/km rate.
- Collect pickup, date/time, vehicle type, and the trip fields needed by the selected hire type. Keep manual pickup entry available; location permission is requested only after the customer asks to use current location.
- Show only vehicles whose owner, identity evidence, vehicle evidence, availability, and block state pass the eligibility checks.
- Explain cash payment and distinguish local estimates from outstation rates. Do not invent an outstation total from customer-entered distance.
- Create a pending request only after server confirmation. Prevent duplicate submissions and prevent overlapping accepted/live-pending bookings for one cab.
- Expose driver/customer phone contact only after acceptance, through the system dialer.
- Let parties see booking state and the supported cancellation/rejection/completion outcomes.

### Driver and vehicle trust

- Require an owner account and the latest approved Aadhaar file plus selfie before driver approval. Do not store the Aadhaar UID as a text value.
- Require each vehicle to have a registration number, latest approved RC, approved current insurance, and approved current PUC before vehicle approval/availability.
- Let an admin inspect, approve, or reject each latest evidence item. Rejections need a reason; replacements create a new review item.
- Keep evidence in private Supabase Storage. Aadhaar, RC, insurance, and PUC must never be exposed to customers.
- Use the approved selfie as the driver photo only when the driver opts in. A vehicle photo is optional. Both display photos require admin approval and must not affect booking eligibility.
- Make a changed registration number invalidate prior RC approval. Expired or replaced required evidence must make affected supply unavailable until it is reviewed again.

### Stand operations

- Let an approved owner set availability and optional daily working hours.
- Give the owner a list of incoming/upcoming requests with accept/reject, cancellation, and completion actions permitted by the lifecycle.
- Give admins mobile controls to review driver/vehicle evidence, approve/reject owners and vehicles, block/unblock accounts or vehicles, inspect booking state/history, and view weekly pilot counts.
- Support Hindi and English for the active app flows.
- Make demo mode useful for local exploration without touching Supabase or representing synthetic evidence as real documents.

## Non-functional and operational requirements

- **Fail closed:** UI visibility is not an authorization boundary. Database view, RLS, triggers, and booking checks must enforce approval and booking invariants.
- **Privacy:** no service-role key in the app; no Aadhaar number in metadata; no customer access to identity evidence; release phone details only after acceptance; display photos are opt-in/approved and short-lived URLs.
- **Low operating cost:** no SMS, online payments, paid map requirement, or mandatory scheduled job for correctness. Push is best-effort and optional.
- **Weak connectivity:** retain manual pickup, do not claim a booking succeeded before server confirmation, protect retries with a request key, and make sync failure recoverable.
- **Local use:** availability uses India time. The current app uses plain text date/time inputs and supports same-day windows only.
- **Auditability:** retain booking status history and document-level review status. Define document retention/deletion operations before real Aadhaar collection.

## Explicitly outside MVP

- Online payment, wallet, subscription, commission collection.
- Live map, turn-by-turn navigation, route-distance calculation, live driver tracking, geofencing.
- In-app chat, ratings/reviews, automatic dispatch, surge pricing, multi-town/marketplace expansion.
- A separate web admin console; the mobile admin is the first-pilot operating surface.
- Real AdMob serving; the current ad surface is only a placeholder.
- SMS OTP, SMS notifications, or a claim that a phone number has been verified. Current authentication intentionally does not prove phone ownership.

## Decisions and open operator inputs

Approved decisions: phone/password with no SMS; cash-only; final outstation fare agreed with the driver; system dialer after acceptance; manual driver/vehicle evidence review; optional, opt-in display photos; no map in the booking flow.

Still needed before a public pilot:

1. Pick the pilot town and operational service area.
2. Provision the first admin and document the registration/identity review procedure.
3. Choose a stand support contact and human-assisted account recovery/impersonation process.
4. Choose retention and secure deletion periods for Aadhaar and other evidence.
5. Decide whether to configure Cron for timely expiry status while all apps are closed; booking-slot correctness already excludes stale pending requests.
6. Set pilot success thresholds for search-to-request, owner response, expiry, cancellation, and completion. Current analytics capture counts, but no target thresholds are agreed.

## Release rule

“Implemented” in the backlog means app/schema source exists. It does not mean the cloud schema, RLS, push credentials, webhook, or Android permissions have been deployed and verified. The P0 rollout stories in [the roadmap](../plans/prd-mvp-roadmap.md) remain release gates until checked in a disposable Supabase project and the target Android build.
