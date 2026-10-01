# Mera Saarthi — Stitch product review

**Reviewed:** 2026-10-01  
**Stitch project:** Mera Saarthi Android App (`15721801887267160806`; 42 screens)  
**Lens:** What is needed to run a trustworthy, low-cost local taxi-stand pilot?

## What is working in the concept

- The Hindi-first, high-contrast, large-control approach fits shared and lower-cost Android phones and users who may not be comfortable with complex forms.
- The customer booking path explains local versus outstation travel, cash payment, available cabs, booking confirmation, and booking status.
- The designs cover important non-happy paths: no cabs, cancellations, booking exceptions, and weak-network states.
- Separate owner, dispatcher, verification, and admin screens acknowledge that a taxi stand has real operations behind the customer app.

## Priorities before a real pilot

### P0 — make a booking dependable and safe

1. **A usable pickup:** accept a searchable place and landmark, offer device location when requested, show the chosen pickup consistently on review and confirmation, and allow a typed fallback. Add a driver-confirmed pickup detail if a village or market name is too broad.
2. **A real booking lifecycle:** define when a request expires, verify atomic cab/time-slot reservation under concurrent requests, show pending/accepted/rejected/cancelled states consistently, and prevent duplicate submissions when the network retries.
3. **Driver and cab trust:** decide who checks identity, driving licence, registration, insurance/permits, and how expired or rejected documents disable a cab. The owner-verification screens need an actual review queue and auditable decision.
4. **Clear fare agreement:** label the shown amount as an estimate, tell customers what can change it (distance, waiting, tolls, return travel), and capture the final amount both sides agree to before the trip.
5. **A help and safety path:** make it easy to call the driver/stand, report a problem, and cancel with a reason. Add an emergency contact or trip-sharing action before enabling rides with unfamiliar drivers.
6. **Account recovery:** password-only phone accounts without phone confirmation do not prove phone ownership. Decide how a customer can recover an account or resolve an impersonation report without introducing an SMS dependency.
7. **Location privacy:** explain that place searches go to the geocoder and that device coordinates are used only after permission; document retention and support a manual pickup for customers who decline.

### P1 — make the stand operable every day

- Give drivers an obvious availability/working-hours control and a way to pause new requests; show the last-updated time so stale availability is visible.
- Define what happens when no cab is available: retry time, waitlist, another nearby stand, or a clearly labelled call to the stand.
- Keep booking state usable on weak connections: show offline/retrying state, retain an unsent request, and avoid claiming a booking was placed until the server confirms it.
- Add no-show handling, cancellation cut-offs, support ownership, and notification fallbacks for customers and owners.
- Capture pickup landmark/instructions and passenger count; make outstation one-way/return and waiting assumptions explicit.

### P2 — add only when the pilot needs it

- Live map and turn-by-turn tracking can wait. A verified address plus landmark and a call-to-driver fallback will solve more early rural pickups with less battery, API setup, and data usage.
- Add richer dispatch analytics, service-area boundaries, local-language push notifications, and integrated payments after a stand has enough rides to justify them.

## Current app comparison

The current app has a customer search, cab results, a booking review, owner screens, admin screens, and demo/live data paths. The Stitch file contains many operational screens, but a screen in a prototype is not yet a working workflow. Pickup was free text defaulting to “Main Market”; this review replaces that default with a bilingual location picker, permission-on-request, and required pickup validation. The app did not render a map; the unused maps package and configuration have been removed because the customer path does not need a map to search or request a cab.

## Location implementation choice and limit

Use foreground device location only after the user taps “Use my location.” Search place names with a 500 ms type pause, show OpenStreetMap attribution, and keep typing available if permission or network access is unavailable. The prototype uses Photon’s public demo endpoint to avoid map billing and an API key. Photon maintainers say that endpoint has no availability guarantee and can be throttled; it is suitable for a small pilot experiment, not a production service-level commitment. Before public launch, choose a managed geocoder or host Photon and set a request budget.
