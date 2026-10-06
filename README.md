# Mera Saarthi

Android-first cab booking MVP for a rural market. It includes Supabase phone/password accounts and shared booking data, plus a Hindi-first demo mode that saves sample bookings and vehicle changes on the current device.

For product scope, the current feature map, epic/story acceptance criteria, and roadmap, start at [the product and engineering handoff](docs/product/README.md).

## What works in the demo

- Customer: register/login, choose local hourly/full-day or outstation per-km hire, filter vehicle types, enter date/time and trip details, see estimates, request a cab, view driver details after acceptance, and cancel.
- Owner: register/login, submit vehicle registration for review, set rates and daily hours, manage availability, accept/decline requests, and mark completed trips.
- Admin: review driver Aadhaar/selfie and vehicle RC/insurance/PUC files individually, approve/reject owners and vehicles, block/unblock accounts, view booking status history, and see weekly pilot event counts.
- Hindi/English toggle, pickup place suggestions, and optional device-location pickup.
- Data persists on the current device with AsyncStorage.

The demo role switch is visible only in demo mode. It includes a fully approved bookable driver, a driver with a rejected selfie, a vehicle with rejected insurance, a vehicle with expired insurance, and optional vehicle-photo review. Owners can opt in to showing their approved selfie on customer listings. Approved selfie and vehicle-photo states use placeholders in demo mode; demo files are synthetic and never contain real documents. Cloud mode uses Supabase auth and row-level policies. Owners can opt in to Android push alerts for new booking requests. The Google Ads space is a placeholder; real ad serving requires an AdMob account and Google Mobile Ads integration.

## Run on Android

1. Install Node.js 20.19.4 or newer and Android Studio / Android SDK.
2. Install dependencies with `npm install`.
3. Start Expo with `npm start`, then press `a` to use an Android emulator or scan the QR code in Expo Go.

The booking flow does not use a map. Pickup search uses Photon place suggestions; tapping **Use my location** asks for location access. If permission or internet is unavailable, enter the pickup place manually. Photon’s public service is intended for reasonable use and has no uptime guarantee; use a managed geocoder or host Photon before a public launch.

## Connect Supabase

1. Add your Supabase project URL and publishable key to `.env.local`. Never put a service-role key in the app.
2. For a new project, validate the tracked schema and migrations in an isolated Supabase project, then deploy through the authenticated Supabase CLI so migration history is recorded. For an existing project initialized manually from `supabase/schema.sql`, first adopt and compare that baseline into migration history; never blindly replay the schema or paste pending migrations into Production SQL Editor. See the [EP-04 rollout research](docs/research/2026-10-05-ep04-research.md).
3. In Supabase Authentication settings, enable sign-up with phone numbers and turn off phone confirmation. No Twilio or SMS setup is needed when confirmation is off. Phone numbers will not be checked during sign-up.

## Sign in or create an account

- To sign in, enter your phone number and password, then tap **Sign in**.
- To create an account, tap **New here? Create an account**. Enter your name, choose **Customer** or **Cab owner**, enter your phone number and a password with at least 6 characters, then tap **Create account**.
- To try the app without an account, tap **Open demo**.

Provision the first admin through the reviewed operator procedure after confirming the account's auth/profile ID. Admin provisioning is privileged and should be audited; do not put a real phone number into source control or issue the update before the target schema has been validated.

For an EAS/store build, configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS environment variables too.

## Automated Android builds

Every push to `main` (including merged pull requests) triggers a production Android App Bundle build on EAS. It does not submit the build to Google Play. Before the workflow can run, add an Expo access token as the repository Actions secret `EXPO_TOKEN` in GitHub → Settings → Secrets and variables → Actions. Create the token in your Expo account's access-token settings and keep its value out of source control. The workflow queues the cloud build and exits without waiting for EAS to finish; check the EAS dashboard for build completion.

The SQL defines profiles, vehicles, bookings, cash-only payment, customer/owner/admin policies, owner and vehicle review, booking expiry, status history, device push tokens, and privacy-limited pilot metrics. A new cloud signup is set to customer or owner from the role chosen in the app; admin cannot be self-selected. Without phone confirmation, people can sign up using a phone number they do not own.

Drivers submit a private Aadhaar identity file and a selfie; each vehicle needs a registration certificate, current insurance, and current PUC certificate. Admins review each latest file, choose a reason when requesting a replacement, approve the driver, approve each vehicle, and then the owner turns availability on. Replacing a reviewed file or changing a registration number sends the affected approval back to review; after a registration change, the RC must be uploaded again. Expired insurance or PUC files immediately remove that vehicle from search and booking until replaced and reapproved.

Verification files are intended for a private Supabase Storage bucket. Admin file links expire after five minutes; filenames and Aadhaar numbers are not copied into the database. A retention migration and server-side purge worker are implemented locally but are not deployed or scheduled. Review the proposed policy with privacy/legal counsel, validate the migration in staging, and configure the worker schedule before collecting real Aadhaar files. See [retention worker setup](supabase/functions/purge-verification-files/README.md).

## MVP decisions / follow-up

- Outstation shows the driver's saved one-way ₹/km rate. Customer-entered kilometres and a guessed total have been removed; customer and driver agree the final distance and fare directly.
- Local trips use the hourly rate below 8 hours and the full-day rate at 8 hours or more.
- Date/time are currently typed into simple fields. Booking overlap is checked locally and again in the database; the outstation duration is an estimate supplied by the customer.
- Pickup autocomplete is biased toward India and, after the user shares their location, toward nearby places. The app does not show a map or calculate a route.
- Availability hours are optional daily windows in India time. The booking must fit within the entered window; leave both fields blank for any time.
- Pending requests expire after 15 minutes. They are marked expired when the app next refreshes. To run expiry on a schedule while the app is idle, enable Supabase Cron and schedule `select public.expire_stale_bookings();` every few minutes.
- Push alerts are best effort and require the setup below. Booking success does not depend on notification delivery.
- No support phone number is configured. For now, customers and owners should contact the local stand administrator directly for help.

## Enable owner booking push alerts (Android)

Push alerts cost nothing to send through Expo's push service, but require an Android development/store build and Firebase Cloud Messaging credentials. Expo Go is not suitable for validating Android push notifications.

1. Create or select the Expo/EAS project for this app, then set `EXPO_PUBLIC_EAS_PROJECT_ID` to its project ID in local and EAS build environments. The app config currently contains the project's ID as a fallback; replace it if the app is linked to a different EAS project.
2. In Expo's EAS credentials, add the Android Firebase Cloud Messaging V1 service-account key for the same Firebase project as the Android app. Keep service-account JSON out of Git and out of app environment variables.
3. Apply the reviewed migration chain to the target Supabase project, including `20261006000400_retention_cron_and_booking_webhook.sql`. Do not set up a second Database Webhook: that migration installs the `pg_net` booking-insert trigger, and configuring both would send duplicate alerts.
4. Set the Edge Function secret and deploy the function:

   ```sh
   supabase secrets set BOOKING_PUSH_WEBHOOK_SECRET="<long-random-secret>"
   supabase functions deploy send-booking-request --no-verify-jwt
   ```

   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available to Edge Functions by default. The service-role key must remain server-side. The function disables gateway JWT verification because the database trigger authenticates with the shared header secret.
5. In the Supabase SQL Editor, store the Edge Function base URL and the same random secret in the private schema. Replace both placeholders; never commit this SQL with real values:

   ```sql
   insert into private.service_secrets (name, secret)
   values
     ('edge_function_base_url', 'https://<project-ref>.supabase.co/functions/v1'),
     ('booking_push_webhook_secret', '<same-long-random-secret>')
   on conflict (name) do update
   set secret = excluded.secret, updated_at = now();
   ```

6. Build and install a development APK on a physical Android device (Expo Go cannot validate remote push). Sign in as an approved owner and enable booking alerts. Use a separate customer account to create a booking for that owner's approved, available vehicle. Confirm the notification arrives and tapping it opens the owner request list with that booking highlighted.

The notification contains only generic text and a booking UUID. A successful Expo push ticket means Expo accepted the message, not that Android displayed it. The sender removes tokens immediately when Expo returns `DeviceNotRegistered` in a push ticket; it does not yet persist tickets or poll asynchronous receipts, so inspect Expo receipts when diagnosing provider credential or delivery failures. Push failure never changes booking state.

### Push notification test checklist

1. **Configuration:** Confirm the installed app was built for this EAS project after FCM V1 credentials were added. Confirm the function is deployed with `--no-verify-jwt`, `BOOKING_PUSH_WEBHOOK_SECRET` matches the private database secret, the Edge Function URL is correct, and the trigger exists on `public.bookings`.
2. **Opt-in and token:** On the physical owner device, allow Android notifications and enable alerts in the owner dashboard. In Supabase, verify one `push_tokens` row exists for the signed-in owner. Turn alerts off and verify that row is removed; turn them back on for subsequent checks.
3. **Foreground delivery:** Keep the owner's app open, create a pending booking from another customer account, and verify the generic alert appears. Tap it and verify the matching request is brought to the top of the owner's list.
4. **Background and closed-app delivery:** Repeat with the owner app in the background, then swipe it away from the recent-apps view. Verify Android displays the alert and tapping it opens the matching request. Confirm the booking remains correct if the notification is delayed or absent; refreshing the app must still show the booking.
5. **Eligibility and privacy:** Try with a pending/rejected or blocked owner/vehicle and confirm no notification is sent. Inspect the notification tray and confirm it contains no customer name, phone, pickup, destination, or fare.
6. **Failure behavior:** Temporarily use an invalid FCM credential in a non-production test project, submit a booking, and verify the booking succeeds even though push fails. Restore the credential and use Expo push tickets/receipts to diagnose the failure. Never test credential failure against production.
7. **Stale token:** In a non-production project, register a test Expo token that the Expo push service reports as `DeviceNotRegistered`, send a booking request, and verify that token is removed from `push_tokens` while other devices for the owner remain registered.
