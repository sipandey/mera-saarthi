# Mera Saarthi

Android-first cab booking MVP for a rural market. It includes Supabase phone/password accounts and shared booking data, plus a Hindi-first demo mode that saves sample bookings and vehicle changes on the current device.

## What works in the demo

- Customer: register/login, choose local hourly/full-day or outstation per-km hire, filter vehicle types, enter date/time and trip details, see estimates, request a cab, view driver details after acceptance, and cancel.
- Owner: register/login, toggle vehicle availability, add vehicles, set hourly/full-day/per-km fares, and accept or decline requests.
- Admin: dashboard counts, manage customer/owner accounts and vehicles, block/unblock accounts, and view bookings.
- Hindi/English toggle, pickup place suggestions, and optional device-location pickup.
- Data persists on the current device with AsyncStorage.

The demo role switch is visible only in demo mode. Cloud mode uses Supabase auth and row-level policies. The Google Ads space is a placeholder; real ad serving requires an AdMob account and Google Mobile Ads integration.

## Run on Android

1. Install Node.js 20.19.4 or newer and Android Studio / Android SDK.
2. Install dependencies with `npm install`.
3. Start Expo with `npm start`, then press `a` to use an Android emulator or scan the QR code in Expo Go.

The booking flow does not use a map. Pickup search uses Photon place suggestions; tapping **Use my location** asks for location access. If permission or internet is unavailable, enter the pickup place manually. Photon’s public service is intended for reasonable use and has no uptime guarantee; use a managed geocoder or host Photon before a public launch.

## Connect Supabase

1. Add your Supabase project URL and publishable key to `.env.local`. Never put a service-role key in the app.
2. In the Supabase SQL Editor, run `supabase/schema.sql` once.
3. In Supabase Authentication settings, enable sign-up with phone numbers and turn off phone confirmation. No Twilio or SMS setup is needed when confirmation is off. Phone numbers will not be checked during sign-up.

## Sign in or create an account

- To sign in, enter your phone number and password, then tap **Sign in**.
- To create an account, tap **New here? Create an account**. Enter your name, choose **Customer** or **Cab owner**, enter your phone number and a password with at least 6 characters, then tap **Create account**.
- To try the app without an account, tap **Open demo**.

To create the first admin, sign up another account then run the following in the SQL Editor, replacing the phone number with the admin's full `+91...` number:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where phone = '+91XXXXXXXXXX');
   ```

For an EAS/store build, configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS environment variables too.

The SQL defines profiles, vehicles, bookings, cash-only payment, customer/owner/admin policies, and account blocking. The first admin role must be granted from the SQL editor. A new cloud signup is set to customer or owner from the role chosen in the app; admin cannot be self-selected. Without phone confirmation, people can sign up using a phone number they do not own.

## MVP decisions / follow-up

- Outstation distance is customer-entered and produces an estimate from the driver's per-km rate. Confirm whether the business should charge one-way or round-trip kilometres and whether a minimum distance applies.
- Local trips use the hourly rate below 8 hours and the full-day rate at 8 hours or more.
- Date/time are currently typed into simple fields. Booking overlap is checked locally and again in the database; the outstation duration is an estimate supplied by the customer.
- Pickup autocomplete is biased toward India and, after the user shares their location, toward nearby places. The app does not show a map or calculate a route; customers enter outstation distance manually.
