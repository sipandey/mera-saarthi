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
