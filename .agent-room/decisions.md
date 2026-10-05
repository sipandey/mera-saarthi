# Decisions Log — mera-saarthi

Short, append-only record of architecture/design decisions and why. A
decision belongs here if a future session (or a future you) would otherwise
have to re-derive it from scratch by reading git history.

## Format

```
### YYYY-MM-DD — short title

**Decision:** what was decided.
**Why:** the constraint or trade-off that drove it.
**Rejected:** what else was considered, and why it lost.
```

<!-- Entries go below this line, newest first. -->

### 2026-10-03 — display approved driver and optional vehicle photos privately

**Decision:** Reuse the approved driver selfie as the customer-facing driver photo only when the owner opts in. Let owners upload one optional vehicle photo per vehicle. Keep both files in the private evidence bucket, require admin approval before display, and issue short-lived signed links only to customers viewing currently bookable vehicles. Vehicle-photo review never resets approval or affects booking eligibility.
**Why:** Reusing the selfie avoids collecting a duplicate driver portrait, while explicit opt-in and optional vehicle images improve listings without requiring public exposure or blocking supply. Private storage keeps access scoped to eligible listings and lets operators reject inappropriate photos.
**Rejected:** Making display photos required for approval, because the user requested optional display; public bucket URLs, because signed links preserve the existing private-evidence boundary.

### 2026-10-03 — build internal Android APKs on main pushes

**Decision:** Use EAS Workflows with a GitHub `push` event for `main` and the `preview` Android APK profile. Increment the build number remotely for each build and distribute through the Expo internal build link.
**Why:** A merge to `main` should produce an installable demo build without a store submission, and testers need repeat installs to update cleanly.
**Rejected:** Building on every feature branch push, because demo APKs should reflect the code accepted into `main`; a GitHub Actions workflow with a separate long-lived Expo token, because the linked Expo GitHub App can trigger EAS Workflows directly.

### 2026-10-03 — approve the latest private evidence per driver and vehicle

**Decision:** Store Aadhaar/selfie and vehicle RC/insurance/PUC in a private bucket. Keep document review separate from driver and vehicle approval; only the newest approved file per requirement counts, registration evidence must postdate a registration-number change, insurance and PUC must be unexpired in India time, and replacing evidence resets the affected approval. Keep Aadhaar numbers out of database metadata and use short-lived admin signed links.
**Why:** Drivers may have several vehicles, and a rejected or replaced file must not be accidentally treated as approved. Database listing and booking gates must fail closed even when a client skips the review UI.
**Rejected:** One approval flag for the whole account, because it cannot represent one valid vehicle beside another in review; public file links or storing Aadhaar UID in a text field, because they expose sensitive identity data.

### 2026-10-02 — send owner booking alerts through Expo Push Service

**Decision:** Register owner Expo tokens in Supabase and dispatch generic booking-request notifications from a Supabase Edge Function triggered by a database INSERT webhook. Require a shared webhook secret, recheck owner/vehicle approval before delivery, and include only the booking UUID in notification data.
**Why:** Expo Push Service plus Android FCM V1 fits the low-cost Android pilot, and server-side dispatch keeps service credentials out of the app. Notification delivery is best effort and must not control booking state.
**Rejected:** Sending directly from the app, because clients cannot safely hold server credentials; SMS, because the user explicitly wants no SMS cost; including trip/contact details, because the notification tray can be visible on a locked phone.

### 2026-10-02 — fail closed on owner and vehicle review

**Decision:** New and existing owners/vehicles start pending; only approved owners and individually approved, unblocked vehicles may be listed or booked. A changed registration number resets an approved vehicle to pending and unavailable.
**Why:** UI-only gating is bypassable through the Supabase API, and pre-review listings cannot be trusted implicitly. Manual registration review keeps the one-town pilot low cost.
**Rejected:** Approving legacy listings automatically, because that would preserve the unsafe path the review flow is intended to close; adding document uploads now, because no storage bucket or review process is configured.

### 2026-10-02 — expire requests lazily and preserve slot correctness

**Decision:** Pending requests expire after 15 minutes. App refresh marks them expired; the slot trigger ignores stale pending rows even if no client or scheduled job has run. A Supabase Cron call is optional for timely status display while all clients are idle.
**Why:** The slot invariant must not depend on push delivery or a paid background service. Lazy expiry keeps the pilot's operating cost low and does not leave a cab blocked after a lost request.
**Rejected:** Relying only on the app timer, because an app may be closed; requiring Cron for correctness, because projects may not have it configured.

### 2026-10-02 — quote outstation trips by saved rate only

**Decision:** Keep the driver's one-way ₹/km rate visible, remove customer-estimated kilometres and show no outstation total. Snapshot the saved per-km rate on the booking and state that final distance/fare is agreed with the driver.
**Why:** The app has no trusted route/distance source and a guessed total would mislead customers.
**Rejected:** Multiplying the driver's rate by an unverified distance entered by the customer.

### 2026-10-02 — keep pilot analytics event-only and PII-free

**Decision:** Store event name, timestamp, and optional booking UUID only; expose weekly aggregates to admins through a database function.
**Why:** The first pilot needs a funnel signal but not names, phone numbers, destinations, fares, or coordinates in analytics.
**Rejected:** A third-party analytics SDK before the single-town funnel and privacy needs are validated.

### 2026-10-01 — use the system dialer for accepted booking contact

**Decision:** After a booking is accepted, show a tap-to-call action for the other party using Android's `tel:` link. Keep the contact number hidden until acceptance and open the dialer rather than requesting direct-call permission.
**Why:** Calling is in the MVP journey, the secure contact RPC already releases each phone number only to the two parties after acceptance, and the system dialer keeps the app simple without adding phone permissions.
**Rejected:** In-app calling or `CALL_PHONE` permission, because neither is required to connect customer and driver for this pilot.

### 2026-10-01 — use text search and foreground location for pickup

**Decision:** Keep pickup selection map-free. Use Expo Location only after the user taps “Use my location,” and use Photon suggestions after a short typing pause. Keep manual address entry available and require a pickup value before cab search.
**Why:** The current Android screen does not render a map, and this taxi-stand flow needs a recognizable pickup area more than turn-by-turn navigation. The Photon public endpoint is free for reasonable MVP traffic and avoids map billing/API-key setup; it has no availability guarantee, so production traffic should move to a managed geocoder or a hosted Photon instance. Show OpenStreetMap attribution.
**Rejected:** Google Places/Maps as a hard dependency, because it requires billing setup and is not needed to identify pickup areas; requiring location permission on app start, because manual search should work when a user declines.

### 2026-10-01 — use phone and password without SMS verification

**Decision:** Keep Supabase Auth phone/password sign-up and sign-in, but do not invoke SMS OTP. Require Phone sign-ups enabled and phone confirmation disabled in the Supabase project; report when confirmation still prevents an immediate session.
**Why:** The user wants to avoid SMS costs. Supabase Auth remains responsible for salted password hashing and sessions, while disabling confirmation means the app does not prove ownership of the submitted phone number.
**Rejected:** A local credential store or an OTP flow, because those either duplicate authentication insecurely or incur SMS costs.

This supersedes the previous decision to present an OTP screen when phone confirmation is enabled.

### 2026-10-01 — delegate password storage and phone verification to Supabase Auth

**Decision:** Keep phone/password accounts in Supabase Auth, verify phone ownership with its SMS OTP flow when confirmation is enabled, and store no app-managed password ciphertext or hashes.
**Why:** Client-side encryption cannot safely protect credentials from a key embedded in the app. Supabase Auth already stores salted password hashes and issues the sessions used by the app's row-level security policies. Phone sign-up must be enabled in the project settings.
**Rejected:** A custom password table or client-side encryption, because either would create a new authentication system without safe password verification, recovery, or session issuance.

### 2026-10-01 — put trip details after ride-type selection

**Decision:** Keep the customer home screen to pickup, local/outstation choice, cash-fare reassurance, and a single search action; collect date, time, vehicle, and distance on a separate trip-details screen.
**Why:** The Stitch taxi-stand prototype emphasizes a short first decision on mobile. Moving secondary filters to the next step reduces the amount of form work before cab discovery while preserving the existing booking data and validation.
**Rejected:** Keeping all booking fields on the home screen, because that buries the ride choice and primary action in a long scroll.

### 2026-10-01 — use the minimal create-agent-room Codex scaffold

**Decision:** Add create-agent-room 2.7.0's minimal preset with only its Codex adapter; do not add the CLI as an app dependency or initialize Git.
**Why:** The project needs durable decision, anti-pattern, and scope records without changing the Android runtime. This workspace has no Git repository, so hook-based enforcement cannot be installed under the repository workflow rules.
**Rejected:** Enabling the Git adapter now, because that would require initializing or attaching a repository first.
