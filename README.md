# Mera Saarthi

Android-first cab booking MVP for a rural market. It includes Supabase phone/password accounts and shared booking data, plus a Hindi-first demo mode that saves sample bookings and vehicle changes on the current device.

## What works in the demo

- Customer: register/login, choose local hourly/full-day or outstation per-km hire, filter vehicle types, enter date/time and trip details, see estimates, request a cab, view driver details after acceptance, and cancel.
- Owner: register/login, toggle vehicle availability, add vehicles, set hourly/full-day/per-km fares, and accept or decline requests.
- Admin: dashboard counts, manage customer/owner accounts and vehicles, block/unblock accounts, and view bookings.
- Hindi/English toggle and a Google Maps preview.
- Data persists on the current device with AsyncStorage.

The demo role switch is visible only in demo mode. Cloud mode uses Supabase auth and row-level policies. The Google Ads space is a placeholder; real ad serving requires an AdMob account and Google Mobile Ads integration.

## Run on Android

1. Install Node.js 20.19.4 or newer and Android Studio / Android SDK.
2. Install dependencies with `npm install`.
3. Start Expo with `npm start`, then press `a` to use an Android emulator or scan the QR code in Expo Go.

Google Maps tiles work in Expo Go. A standalone Android build needs a Google Maps Platform project with Maps SDK for Android enabled, a restricted API key, and a Cloud billing account. Set `GOOGLE_MAPS_API_KEY` in `.env.local` before making a native build. Restrict the key to **Android apps**, package `in.merasaarthi.cabs`, and your signing SHA-1; also restrict API access to **Maps SDK for Android**. Do not use an IP restriction for the app. Google currently lists Android Maps SDK usage as unlimited at no charge; adding Places, geocoding, or directions later can introduce separate billable APIs.

## Connect Supabase

1. The project URL and publishable key are already in your ignored local `.env.local`. Never put a Supabase service-role key in the mobile app.
2. Run `supabase/schema.sql` in the Supabase SQL Editor before launching the app. It creates profiles, vehicles, bookings, availability policies, overlap checks, and the driver-contact function.
3. Enable **Phone** under Supabase Authentication → Sign-in methods. If you turn on phone confirmation, configure an SMS provider; the app supports the confirmation code screen. India SMS delivery may require provider setup and TRAI DLT registration.
4. Sign up an owner and a customer in the app. For the first admin, sign up another account then run the following in the SQL Editor, replacing the phone number with the admin's full `+91...` number:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where phone = '+91XXXXXXXXXX');
   ```

5. For an EAS/store build, configure `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and the restricted `GOOGLE_MAPS_API_KEY` as EAS environment variables too.

The SQL defines profiles, vehicles, bookings, cash-only payment, customer/owner/admin policies, and account blocking. The first admin role must be granted from the SQL editor. A new cloud signup is set to customer or owner from the role chosen in the app; admin cannot be self-selected. Do not put a Supabase service-role key in the mobile app.

## MVP decisions / follow-up

- Outstation distance is customer-entered and produces an estimate from the driver's per-km rate. Confirm whether the business should charge one-way or round-trip kilometres and whether a minimum distance applies.
- Local trips use the hourly rate below 8 hours and the full-day rate at 8 hours or more.
- Date/time are currently typed into simple fields. Booking overlap is checked locally and again in the database; the outstation duration is an estimate supplied by the customer.
- The map preview is centered on India until you provide the village/market coordinates. Google Maps Places/geocoding APIs are not called, so customers enter a destination and approximate distance manually.
