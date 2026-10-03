# Mera Saarthi

Android-first cab booking MVP for a rural market. It includes Supabase phone/password accounts and shared booking data, plus a Hindi-first demo mode that saves sample bookings and vehicle changes on the current device.

## What works in the demo

- Customer: register/login, choose local hourly/full-day or outstation per-km hire, filter vehicle types, enter date/time and trip details, see estimates, request a cab, view driver details after acceptance, and cancel.
- Owner: register/login, submit vehicle registration for review, set rates and daily hours, manage availability, accept/decline requests, and mark completed trips.
- Admin: approve/reject owners and vehicles, block/unblock accounts, view booking status history through the database, and see weekly pilot event counts.
- Hindi/English toggle, pickup place suggestions, and optional device-location pickup.
- Data persists on the current device with AsyncStorage.

The demo role switch is visible only in demo mode. Cloud mode uses Supabase auth and row-level policies. Owners can opt in to Android push alerts for new booking requests. The Google Ads space is a placeholder; real ad serving requires an AdMob account and Google Mobile Ads integration.

## Run on Android

1. Install Node.js 20.19.4 or newer and Android Studio / Android SDK.
2. Install dependencies with `npm install`.
3. Start Expo with `npm start`, then press `a` to use an Android emulator or scan the QR code in Expo Go.

The booking flow does not use a map. Pickup search uses Photon place suggestions; tapping **Use my location** asks for location access. If permission or internet is unavailable, enter the pickup place manually. Photon’s public service is intended for reasonable use and has no uptime guarantee; use a managed geocoder or host Photon before a public launch.

## Connect Supabase

1. Add your Supabase project URL and publishable key to `.env.local`. Never put a service-role key in the app.
2. In the Supabase SQL Editor, run `supabase/schema.sql` once, then run the files in `supabase/migrations/` in timestamp order. The first migration adds booking statuses; the second adds approval, expiry, availability, history, and pilot metrics. Existing owner and vehicle records become unavailable until an admin reviews them.
3. In Supabase Authentication settings, enable sign-up with phone numbers and turn off phone confirmation. No Twilio or SMS setup is needed when confirmation is off. Phone numbers will not be checked during sign-up.

## Sign in or create an account

- To sign in, enter your phone number and password, then tap **Sign in**.
- To create an account, tap **New here? Create an account**. Enter your name, choose **Customer** or **Cab owner**, enter your phone number and a password with at least 6 characters, then tap **Create account**.
- To try the app without an account, tap **Open demo**.

To create the first admin, sign up another account then run the following in the SQL Editor, replacing the phone number with the admin's full `+91...` number:

   ```sql
   update public.profiles
   set role = 'admin', owner_review_status = null
   where id = (select id from auth.users where phone = '+91XXXXXXXXXX');
   ```

For an EAS/store build, configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS environment variables too.

The SQL defines profiles, vehicles, bookings, cash-only payment, customer/owner/admin policies, owner and vehicle review, booking expiry, status history, device push tokens, and privacy-limited pilot metrics. The first admin role must be granted from the SQL editor. A new cloud signup is set to customer or owner from the role chosen in the app; admin cannot be self-selected. Without phone confirmation, people can sign up using a phone number they do not own.

To make the first administrator, update a customer profile to `role = 'admin'`. To review an owner, approve the owner account first, then approve each vehicle after confirming its registration number. The owner must turn availability on after vehicle approval.

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

1. Create or select an Expo/EAS project, then set `EXPO_PUBLIC_EAS_PROJECT_ID` to its project ID in the app's local and EAS build environments.
2. In Expo's EAS credentials, add the Android Firebase Cloud Messaging V1 service-account key for the same Firebase project as the Android app. Keep service-account JSON out of Git and out of app environment variables.
3. Set up the Supabase function secrets from the Supabase project directory:

   ```sh
   supabase secrets set BOOKING_PUSH_WEBHOOK_SECRET="<long-random-secret>"
   supabase functions deploy send-booking-request --no-verify-jwt
   ```

   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available to Supabase Edge Functions by default. The service-role key must remain server-side. The function disables gateway JWT verification because Database Webhooks do not send a user JWT; its required shared secret is the endpoint authentication.
4. In Supabase Database Webhooks, create a webhook on `public.bookings` for **INSERT**. Set its URL to `https://<project-ref>.supabase.co/functions/v1/send-booking-request` and add the header `x-booking-webhook-secret` with the same random secret used above. The function ignores non-pending inserts and rechecks that the owner and vehicle are approved and unblocked.
5. Build and install a development APK, sign in as an approved owner, and enable booking notifications on the owner dashboard. Submit a booking from a separate customer account and tap the notification to open the request.

The notification contains only a generic message and booking ID. Expo's push gateway can accept a message even if Android later cannot display it; review EAS/Expo delivery receipts and Android notification permissions during device validation. Push failure never changes the booking's server state.
