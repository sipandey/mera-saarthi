# Android QA Results — 6 Oct 2026

**Target:** `Pixel_7_API_35` AVD, Google Play ARM64 system image, Android 15/API 35, 1080×2400  
**Build:** local release APK from the current checkout  
**Product scope:** [MVP requirements](../product/requirements-and-mvp.md) and [current application map](../product/current-state.md)

The updated feature branch APK was rebuilt and reinstalled on the same AVD after the initial QA pass. The destination check below is from that build.

## Summary

The app was built, installed, launched, and manually exercised in demo mode. Customer pickup/search, local and outstation pricing, booking creation/cancellation, owner acceptance, accepted-contact release, the system dialer, and the admin review queue were observed. One user-facing accessibility-label defect was found in the language toggle. Cloud security/integration and several lifecycle/device cases remain unverified.

## Setup and build

| Check | Result | Evidence |
|---|---|---|
| Persist Android SDK location | Pass | `~/.zshrc` contains `export ANDROID_HOME="$HOME/Library/Android/sdk"`. |
| Create/start `Pixel_7_API_35` | Pass | Device `emulator-5554`; `sys.boot_completed=1`, API 35, Android 15. |
| Build release APK | Pass | `npm run android -- --variant release --no-bundler`; Gradle `BUILD SUCCESSFUL`, 289 tasks. Metro embedded 724 modules. Generated wrapper was set to Gradle 8.14.3 in the ignored local `android/` project because React Native's pinned Foojay resolver failed under Gradle 9.3.1. No tracked app/build configuration was changed. |
| Install and launch | Pass | Package `in.merasaarthi.cabs` is installed and `MainActivity` launched; logcat recorded `ReactNativeJS: Running "main"` with no fatal exception. |
| APK artifact | Built | [app-release.apk](../../android/app/build/outputs/apk/release/app-release.apk) (local ignored build output). |

The first attempt to fetch the documented EAS preview artifact required an Expo CLI login, so this run used a local release build. Android SDK 36, build tools 36.0.0, NDK 27.1.12297006, and CMake 3.22.1 are now installed. Gradle and React Native emitted deprecation warnings; they did not fail the build.

## Executed feature checks

| Area / trace | Result | Observed behavior |
|---|---|---|
| Demo entry and role flow (MS-14) | Pass | Opened demo without authentication; entered customer, owner, and admin views. Synthetic fixtures and `DEMO MODE` were visible. |
| Hindi/English switch | Pass with finding | Hindi login content changed to English. **Finding:** after switching to English, the button's accessibility description still says “Switch to English”; its visible Hindi label suggests switching back. See finding below. |
| Pickup and autocomplete (MS-16) | Pass | Entered synthetic text `TestVillage`; Photon returned suggestions. Selected “Embassy TechVillage, Shivanasamudra Ward, Karnataka, India”; it remained in the pickup field and carried into trip details. Location permission was not requested. |
| Outstation destination autocomplete (MS-16) | Partial | In the rebuilt APK, the destination field showed the 3-character suggestion hint and OSM attribution, with no current-location action. Typing `Delhi` produced the recoverable “Place search is unavailable” message while retaining the text for manual entry. Live suggestion selection could not be checked because Photon was unavailable during this run. |
| Local cab search and fare (MS-05, MS-07) | Pass | One Ramesh Kumar / Maruti Swift fixture appeared. At 4 hours the card showed ₹180/hour and “Estimated fare: ₹720 · ₹1,400 Full day”; the screen stated cash is paid directly to the driver. |
| Booking review and submit (MS-03, MS-09) | Pass in demo | Review showed pickup, date/time, local hire duration, fare, cash payment, and driver-agreed final extras. Submit produced “Booking request received”; My bookings showed “Waiting for owner.” This is local demo state, not server confirmation. |
| Owner response (MS-03, MS-06) | Pass in demo | Ramesh's owner dashboard showed the pending request; accepting changed it to “Booking confirmed.” Owner vehicle documents, expiries, availability, and rates were visible. |
| Contact release and dialer (MS-01) | Pass in demo | Pending booking had no call action. After acceptance the customer booking showed “Call driver · Ramesh Kumar · 98765 43210.” Tapping opened Android's system dialer with the number; no call was placed. |
| Accepted booking cancellation (MS-03) | Pass in demo | Customer cancellation required a reason; selecting “Plans changed” set the booking status to “Cancelled” and displayed the reason. |
| Outstation fare and no-results recovery (MS-05, MS-07) | Pass in demo | Trip details explained one-way per-km pricing and that the driver confirms chargeable distance/final fare. After canceling the local fixture booking, outstation results showed ₹12/km · one way, “Driver confirms the final fare,” and cash payment, with no fabricated trip total. The earlier occupied-slot search returned zero cabs and offered “Change pickup time or place.” |
| Admin trust-review surface (MS-02, MS-08, MS-12) | Pass, view-only | Dashboard showed customer/owner/vehicle/booking counts and a queue with pending and rejected synthetic Aadhaar/selfie/RC/insurance items and Verify/Decline controls. No review decision was submitted. |

## Finding

**A11Y-P2 — Language toggle announces the wrong destination in English.** After switching the app to English, its accessibility description remained “Switch to English” even though the control toggles back to Hindi. The visible label and tap action worked, but screen-reader users receive a stale action description. Observed on the API 35 emulator.

## Not run / limits

- No successful Photon response or destination suggestion-selection check in the rebuilt APK; the field's manual fallback was observed.
- No cloud sign-in, Supabase RLS/API-bypass, private Storage/signed-link, server concurrency, account-closure, offline-retry, or production migration checks. The product docs require a disposable configured Supabase project for those checks; demo mode does not prove backend behavior.
- No document upload/camera/gallery permission flow, denied-location recovery, booking rejection/expiry/completion, availability-window edge cases, or push notification delivery/tap routing.
- Demo approval controls and optional-photo consent were not mutated. Only the positive customer-owner booking path was exercised.
- The final outstation booking review was not opened; the result card itself was verified.
- The scaffold validator could not be run: npm could not resolve `registry.npmjs.org` (`ENOTFOUND`).

No production service was modified. Demo records are local to the emulator.
