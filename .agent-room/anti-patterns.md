# Anti-Patterns Log — mera-saarthi

Negative knowledge: things that have already gone wrong here, so nobody
(human or agent) repeats them. One avoided bug is worth more than one
polished example — keep entries short and concrete.

Append a new entry every time:
- a bug slips through and you find the root cause,
- an approach seemed reasonable but turned out wrong,
- a fix gets reverted because it only patched a symptom.

## Format

```
### YYYY-MM-DD — short title

**What happened:** one or two sentences.
**Root cause:** the actual cause, not the symptom.
**Avoid:** the concrete rule that would have prevented it.
```

<!-- Entries go below this line, newest first. -->

### 2026-10-06 — announce the language toggle's actual destination

**Bug:** After switching to English, the language control's screen-reader label still announced “Switch to English” even though tapping it switched back to Hindi.
**Root cause:** The shared header used the fixed `switchToEnglish` copy in both language states.
**Avoid:** Set the accessibility label from the current language and announce the language the control will switch to.

### 2026-10-06 — duplicate booking pushes from two dispatch configurations

**Bug:** Push setup instructions told operators to create a Supabase Database Webhook even though the migration already installed an INSERT trigger that sends the same event through `pg_net`. The trigger also reads its shared secret from `private.service_secrets`, while the function separately reads the matching value from its Edge Function environment.
**Root cause:** Setup documentation did not follow the database-managed dispatch path or explain that the secret must be configured on both sides.
**Correction:** Document the trigger as the sole dispatcher, remove the manual webhook step, and give explicit instructions for setting both secret copies.

### 2026-10-06 — service-role key without table grants breaks booking push lookups

**Bug:** `send-booking-request` returned HTTP 502 before sending a push on a fresh Supabase project.
**Root cause:** The booking tables had no explicit table-level SELECT grants for `service_role`; bypassing row-level security does not bypass PostgreSQL table privileges.
**Correction:** Grant the function SELECT on vehicles, profiles, and push tokens, plus DELETE on push tokens for Expo-reported stale-token cleanup.

### 2026-10-06 — install app dependencies before EAS resolves config plugins

**What happened:** The GitHub Actions EAS build failed to resolve the `expo-location` config plugin because the runner invoked EAS before installing the app's npm dependencies.
**Root cause:** The workflow installed the EAS CLI but skipped the repository's lockfile-based `npm ci` step.
**Avoid:** Run `npm ci` before `eas build` so local Expo packages and config plugins are available when EAS evaluates the project.

### 2026-10-06 — match the EAS runner Node version to its CLI dependencies

**What happened:** The Android EAS workflow failed before starting a build because `@oclif/plugin-autocomplete@3.3.0` requires Node.js 22 or newer, while the runner used Node.js 20.19.4.
**Root cause:** The workflow's runtime was selected without checking the installed EAS CLI dependency engine requirements.
**Avoid:** Keep the GitHub Actions Node.js runtime at 22 for the pinned EAS CLI and recheck engine requirements when changing the EAS CLI version.

### 2026-10-06 — do not parse client dates without explicit timezone offset

**What happened:** Database slot triggers evaluate pickup hours using `(pickup_at AT TIME ZONE 'Asia/Kolkata')::time`, but client dates constructed from strings like `new Date(`${date}T${time}:00`)` parsed in the device's local timezone. On devices running in UTC or non-IST timezones, pickup times drifted by 5.5+ hours and caused false `check_booking_slot` rejections.
**Root cause:** Date parsing omitted the explicit `+05:30` offset required for pilot town operations.
**Avoid:** Always anchor client date/time strings to `+05:30` when interacting with server availability, slot conflict checks, or booking creation.

### 2026-10-06 — do not equate a profile-delete trigger with account deletion

**What happened:** The evidence-retention migration queued files from a profile-delete trigger, but profiles and owner vehicles with booking history cannot necessarily be deleted because booking foreign keys are restrictive. Booking snapshots would also retain names and trip places.
**Root cause:** Account closure was designed around one table event instead of the full Auth, relational, snapshot, Storage, and audit lifecycle.
**Avoid:** Implement account closure as an idempotent privileged workflow that first ends active access, queues evidence, and anonymizes retained records, then deletes relational and Auth identity.

### 2026-10-05 — scope owner evidence lookups by owner

**What happened:** The demo owner dashboard chose the newest Aadhaar/selfie across all fixture owners because identity documents share a null vehicle ID. A different driver's evidence could appear in the selected owner's checklist.
**Root cause:** The screen filtered by document type and vehicle ID but omitted owner ID.
**Avoid:** Include owner ID in every latest-evidence query, including driver-level evidence where `vehicle_id` is null.

### 2026-10-03 — keep demo admin review controls visible

**What happened:** Demo handlers supported local document and approval changes, but the admin screen hid the approve/reject controls whenever `live` was false.
**Root cause:** The UI gated all review actions on cloud mode even though handlers already had safe demo branches.
**Avoid:** Gate backend mutations in handlers; keep equivalent review controls available in demo mode so the end-to-end scenario can be exercised locally.

### 2026-10-03 — keep demo review actions local

**What happened:** Admin approve/reject actions in demo mode called the cloud review functions, so a demo could appear to offer decisions but could not reliably save them and might touch a configured backend.
**Root cause:** The handlers branched on cloud session for some admin actions but sent owner/vehicle review straight to Supabase even when the role picker was in demo mode.
**Avoid:** Give demo state explicit local review handlers and make cloud mutation depend on an authenticated cloud user; seed demo records with real review states so the same eligibility checks can be demonstrated.

### 2026-10-02 — do not let pending requests block slots forever

**What happened:** A pending booking was treated as an active slot conflict indefinitely, even when its owner stopped using the app.
**Root cause:** The database had no expiry timestamp/state and the slot trigger considered every pending row active.
**Avoid:** Give pending requests a server expiry, exclude stale pending rows inside the slot trigger, and record the terminal transition on refresh or scheduled cleanup.

### 2026-10-01 — do not bias autocomplete to a fixed point

**What happened:** Place suggestions could favor the wrong part of India before the user shared device location.
**Root cause:** Search requests used a fixed central-India point with a neighborhood-scale zoom.
**Avoid:** Restrict India-wide searches by country first; apply a nearby-location bias only after the user chooses to share their location.

### 2026-10-01 — check the rendered screen before debugging Maps

**What happened:** The customer app was described as having a map, but no map appeared in its current booking flow.
**Root cause:** The Maps dependency and setup instructions remained while the customer screen did not render a `MapView`.
**Avoid:** Confirm a map component is part of the active screen before investigating API keys; remove stale map setup when the product flow no longer uses a map.
