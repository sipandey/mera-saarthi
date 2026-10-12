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

## Follow-up after the EAS workflow merge

The app source used for the QA run above is still the app source on `main` at `e1c4d09`; changes since the QA commit `18a94aa` are CI, EAS CLI configuration, and documentation only. The local release APK remains at `android/app/build/outputs/apk/release/app-release.apk` (67 MiB), and the emulator reports package `in.merasaarthi.cabs`, version `1.0.0`, version code `1`, last updated at 16:01 on 6 Oct.

| Follow-up check | Result | Evidence |
|---|---|---|
| Main-branch EAS workflow | Pass — dispatch accepted | [GitHub Actions run #3](https://github.com/sipandey/mera-saarthi/actions/runs/37453821550) completed successfully for `e1c4d09`. |
| EAS cloud artifact | Pending | Production build `b8a2ee83-1d82-4e49-9839-8d03df9dcbc2` was still queued when checked; the workflow uses `--no-wait`, so job success does not prove the AAB completed. |
| New preview build | Not produced | The latest EAS preview listed was from `5620094`, before the destination-autocomplete app changes. Local EAS CLI reports not logged in. |
| Fresh emulator interaction | Blocked | Host disk had 49 MiB free during the emulator launch attempt; the launcher reported insufficient space. ADB subsequently saw `emulator-5554` and an initial query returned boot complete/API 35 with the app installed, but later shell/UI queries stopped responding and screenshot capture failed with “no space left on device.” No additional scenarios are marked passed from this follow-up. |

The earlier manual demo-mode results remain applicable to the current app source. The complete release gate is still open: production build completion, physical Android validation (especially push), backend/security and resilience scenarios, Play declarations, and named operational owners.

## Post-merge regression smoke — 6 Oct 2026

**Source:** `main` at `28b07cc`, with the local language-toggle accessibility fix in the QA worktree. **Target:** `Pixel_7_API_35`, `emulator-5554`, Android 15/API 35. **APK:** local release build at `android/app/build/outputs/apk/release/app-release.apk` (67 MiB).

| Check | Result | Evidence |
|---|---|---|
| Release build | Pass | `./gradlew :app:assembleRelease` completed successfully (289 Gradle tasks). |
| AVD startup and install | Pass after disk recovery | With 1.6 GiB free, the AVD refused to start and ADB shell calls stalled. Removed only generated `android/app/build/intermediates` while preserving the APK; at 2.5 GiB free, the AVD cold-booted and the rebuilt APK installed successfully. |
| App launch and demo entry | Pass | `MainActivity` opened, `ReactNativeJS` reported `Running "main"`, and the Hindi login and customer demo screens rendered. |
| Owner demo screen | Pass | Switched to the synthetic Ramesh owner dashboard. The demo correctly explained booking alerts are Android-only; live push registration is not supported in demo mode. |
| Language toggle accessibility | Fixed and pass | Reproduced the stale “Switch to English” label while the app was in English. Updated the shared header to announce the destination language; the rebuilt APK announced “Switch to Hindi” in English and “अंग्रेज़ी में बदलें” in Hindi. |
| Runtime errors | Pass | No `AndroidRuntime` or `ReactNativeJS` error entries after launch and role/language navigation. The existing SafeAreaView deprecation warning remains. |

**Not verified at the time of this smoke run:** FCM delivery, cloud owner opt-in/out, notification taps, background/closed-app delivery, backend/RLS scenarios, and physical-device behavior. Firebase client config and the EAS FCM V1 credential were configured in the later follow-up below; this target was an emulator rather than a physical device. The A11Y-P2 finding above is resolved in the rebuilt QA worktree; the product change still needs review and merge before a signed release build includes it.

## FCM configuration follow-up — 6 Oct 2026

After the prior smoke run, the Firebase client config and EAS FCM V1 credential were added. This follow-up confirms configuration and local app startup; it does not claim end-to-end push delivery.

| Check | Result | Evidence |
|---|---|---|
| EAS Android service credential | Present | EAS Project credentials page lists an FCM V1 service-account key for `in.merasaarthi.cabs`, associated with Firebase project `mera-saarthi-ea786`. |
| Local native configuration | Pass | `npx expo prebuild --platform android --no-install` copied `google-services.json` and configured the Google Services Gradle plugin in the ignored Android project. |
| Fresh release build | Pass | `./gradlew :app:assembleRelease` completed with `BUILD SUCCESSFUL`; `:app:processReleaseGoogleServices` ran. The generated sender ID matches the Firebase project number. APK timestamp: 18:37 on 6 Oct 2026. |
| Emulator install and launch | Pass | Installed over the existing package on `emulator-5554` and opened `in.merasaarthi.cabs/.MainActivity`; screenshot showed the Hindi login screen. |
| Push delivery and routing | Not run | Requires a real approved owner test account and a controlled booking trigger. No production booking was created as part of this build/configuration check. |

**Remaining release gate:** Validate owner opt-in/token registration, a push ticket and receipt, notification display and tap routing, opt-out, and background delivery on a physical Android device using controlled test accounts. The EAS credential and client config are now present; neither configuration presence nor a successful local build proves push delivery.

## Staging backend and emulator follow-up — 6 Oct 2026

A new isolated Supabase staging project was created in the SP Free organization, South Asia (Mumbai), using the project reference `qndrhjmomkykrcloxvfd`. The generated database password and staging app configuration are stored in ignored `.env.staging` (mode 600); no production records or configuration were changed.

| Check | Result | Evidence |
|---|---|---|
| Staging database initialization | Pass | `supabase db push` applied the baseline plus all 11 subsequent migrations through `20261006000600`; no seed data was applied. |
| Expo staging config | Metadata pass only | `npx expo config` resolved `https://qndrhjmomkykrcloxvfd.supabase.co`, package `in.merasaarthi.cabs`, and a staging key in Expo metadata. This did not verify the build-time `process.env` values used by `src/supabase.ts`; the 7 Oct APK bundle audit found the Production project ref. |
| Staging release build | Build succeeded; target invalidated by bundle audit | `npx expo prebuild --platform android --no-install` and `./gradlew :app:assembleRelease` completed, and Expo metadata contained staging URL/key. A 7 Oct audit found the installed JS bundle instead embeds the Production project ref, so this APK cannot be used as a staging build. |
| Emulator install and startup | Pass; backend target mismatch | Installed on `emulator-5554` (`Pixel_7_API_35`) and opened `in.merasaarthi.cabs/.MainActivity`; the Hindi sign-in screen rendered. The screen launch did not prove the runtime backend target. |
| Staging Auth reachability | Pass | Submitted synthetic invalid login values; the app returned “Invalid login credentials.” No account was created. |
| Anonymous REST permissions | Pass | A request with the staging publishable key to a protected `vehicles` query returned HTTP 401 / PostgreSQL `42501`, with `SELECT` denied for `anon`, as expected for the service-role-only lookup. |
| Staging function and trigger config | Pass | `send-booking-request` was deployed from checked-in source using the replacement staging PAT with `--no-verify-jwt`; its staging-only secret and function URL are configured in Edge Function secrets and `private.service_secrets`. The database trigger uses the custom webhook header. |
| Staging function invocation | Pass | After migration `20261006000600`, a synthetic pending booking with a nonexistent vehicle returned HTTP 200 `{"delivered":0,"skipped":true}`. ACL verification confirmed `service_role` SELECT on `profiles`, `vehicles`, and `push_tokens`, and DELETE only on `push_tokens`. |
| End-to-end owner push | Not run | Requires a healthy deployed function, a synthetic approved owner/device token, and a synthetic booking. No owner account or booking was created. |

**Scope of this pass:** The migration chain and staging function checks were performed against staging. The first 7 Oct emulator APK had staging metadata but a Production JavaScript bundle, so its UI Auth result is not staging evidence; it was replaced by the corrected staging APK documented below. The earlier invalid-login app check is also not reliable staging Auth evidence. The synthetic function response verifies its lookup and skip path only. The production rollout changed database grants/history only; no user records were changed by that migration.

## Production permission migration — 6 Oct 2026

| Check | Result | Evidence |
|---|---|---|
| Production ACL precheck | Pass | Before applying the migration, `service_role` already had effective SELECT access on `profiles`, `vehicles`, and `push_tokens`, and DELETE access on `push_tokens`. |
| Pending migration review | Pass | `supabase migration list` showed only `20261006000600_booking_push_service_role_permissions.sql` pending; `supabase db push --dry-run` confirmed no other changes would be applied. |
| Production migration | Pass | `supabase db push` applied `20261006000600`; migration ledger is now aligned through this migration. It adds explicit grants for the function's required operations; no app data was changed. |

## Staging release-matrix setup — 7 Oct 2026

| Check | Result | Evidence |
|---|---|---|
| Pixel 7 emulator readiness | Pass | `Pixel_7_API_35` is running Android 15/API 35 with Google Play Services, and Mera Saarthi 1.0.0 is installed. |
| Runtime backend target | Pass after rebuild | The previous APK had Production ref `pgmbbtuphpfcjrswptzs`. The rebuilt release bundle contains staging ref `qndrhjmomkykrcloxvfd` and no Production ref; staging Expo config resolves the same host. |
| Release build and install | Pass | `./gradlew :app:assembleRelease` completed with staging variables explicitly loaded; the 67 MB APK installed and launched on `emulator-5554` (`Pixel_7_API_35`). |
| Phone/password signup and login | Pass | With staging phone confirmations temporarily disabled, synthetic `QACustomer` and `QAOwner` accounts signed up without OTP. Owner phone/password sign-in succeeded. Staging phone confirmations were restored after account creation and testing. |
| Staging account persistence | Pass | Staging SQL Editor count query returned 2 `auth.users`, 2 `public.profiles`, and 0 `public.vehicles`; the Auth Users page showed both synthetic phone users. |
| Customer pickup autocomplete | Pass | Searching “Delhi” returned three Photon/OpenStreetMap suggestions, including “Delhi, India”; selecting the result populated the pickup field. |
| Availability search | Pass / no inventory | The app advanced to Trip details and the search returned “0 cabs found” / “No cabs found for this time” for Delhi at the selected time. No booking was submitted. |
| Owner onboarding gate | Pass | Owner dashboard displayed “Your owner account is waiting for admin approval,” zero ride requests, and Aadhaar/selfie not submitted. Toggling selfie display returned “Upload and receive approval for a current selfie before displaying it.” The setting remained off. |
| Approval-dependent booking and push | Not run | Staging has no vehicle, approved owner, approved documents, or device push token. Admin provisioning/approval is needed before these paths can be tested safely. No staging booking, vehicle, identity document, push token, SMS, or notification was created or sent. |
| Earlier Production-targeted test accounts | Cleanup deferred by user | The two synthetic Production accounts/profile rows remain pending the user's later cleanup decision. No further Production requests or changes were made during this staging pass. |

**Staging Auth after QA:** Phone provider enabled, phone confirmations enabled, and email confirmation disabled. Phone confirmations were temporarily disabled only to create the two test accounts; the Twilio provider still has placeholder credentials, so phone confirmation signup will continue to fail until valid staging SMS credentials are configured.

**Next action:** Provision an isolated staging admin and approved synthetic owner/vehicle fixture before testing document review, booking creation, owner push registration, and booking notifications. Keep Production cleanup deferred.

## Staging admin and document-review follow-up — 7 Oct 2026

| Check | Result | Evidence |
|---|---|---|
| Staging admin provisioning and sign-in | Pass | Created a synthetic admin in `mera-saarthi-staging` through the existing fail-closed `bootstrap_initial_admin` function. Phone/password sign-in reached the admin dashboard. Phone confirmation settings were not changed. |
| Synthetic vehicle creation | Pass | The signed-in `QAOwner` created one clearly named QA SUV with synthetic registration text. It remains unavailable pending verification. |
| Private evidence upload | Pass for non-person documents | Uploaded visibly watermarked QA-only placeholders for Aadhaar, RC, insurance, and PUC via the owner app and Android document picker. Insurance and PUC use a future expiry date. No genuine identity or vehicle document data was used. |
| Admin document review | Partial | The admin queue displayed the staging documents. RC, insurance, and PUC were approved in the dashboard; Aadhaar remains pending. These approvals only exercise staging workflow and do not represent valid real-world evidence. |
| Selfie evidence and owner approval | Blocked | The owner selfie control opens the camera. An emulator-camera preview was discarded without submission after the approval review flagged possible biometric content. Owner and vehicle remain pending because the required approved selfie is missing. |
| Booking and push delivery | Not run | With owner/vehicle ineligible, the app offers no bookable vehicle and push registration remains unavailable. No booking, owner push token, SMS, or notification was created/sent. |

The staging setup remains isolated; no Production project or records were changed. The 12 Oct follow-up below records the approved static placeholder and the subsequent booking and push checks.

## Staging approval, booking, and push follow-up — 12 Oct 2026

**Target:** staging project `qndrhjmomkykrcloxvfd` and the staging release APK on `Pixel_7_API_35` (Android 15/API 35). All account, vehicle, evidence, and booking records in this section are synthetic. No Production calls or records were changed.

| Check | Result | Observed evidence |
|---|---|---|
| Static selfie-slot fixture | Pass for the review gate; camera flow not exercised | Created a PNG with the visible text `SYNTHETIC QA / NO PERSON / SELFIE SLOT TEST / STAGING ONLY / NOT IDENTITY EVIDENCE`. Uploaded it to the private staging `verification-documents` bucket and inserted a pending `selfie` record. This fixture was seeded through staging APIs/SQL, not through the app camera. No person image was submitted. |
| Document, owner, vehicle review | Pass in staging | Admin app approved the synthetic selfie and Aadhaar; RC, insurance, and PUC were already approved. The owner and SUV approval buttons became enabled and both were approved. Staging now has five approved verification records, one approved owner, and one approved vehicle. These synthetic approvals do not establish real identity or vehicle validity. |
| Owner sign-in and availability | Pass | Reset only the two synthetic QA account passwords to random temporary values in a mode-600 `/tmp` file. Owner phone/password login worked. The approved SUV's availability switch changed to “Cab available”; the customer app and `available_vehicles` then showed one vehicle. |
| Push permission and opt-in | Pass | Android displayed the notification permission prompt; after Allow, the owner screen showed “Booking alerts are on for this phone” and staging held one `push_tokens` row. No token was printed in the report. |
| Controlled customer API booking | Pass | Authenticated as the synthetic customer while the owner remained signed in on the emulator. `available_vehicles` returned one SUV. A future two-hour local booking inserted as pending at a server-calculated ₹440 cash estimate, with owner/vehicle name snapshots. A second request for the same slot was rejected with “This cab already has a booking around that time.” |
| Booking push function and device alert | Pass for manual dispatch and emulator display | Invoked the staging `send-booking-request` function for that booking through its configured secret header. It returned `{"accepted":1,"attempted":1,"staleTokensRemoved":0}`. Android displayed the “New ride request” notification. Tapping it opened the owner view; scrolling to the request showed “Opened the booking request from your notification” and the matching booking at the top. Expo ticket acceptance alone is not a delivery receipt; the visible Android notification supplies separate device evidence. |
| Automatic database-trigger dispatch | Unverified | No notification was observed before the controlled manual function invocation, and `net._http_response` had no retained rows when inspected. This run proves the function and device path, not that booking INSERT autonomously dispatched a push. Investigate the staging `pg_net` trigger/worker and function logs before treating this as a release pass. |
| Owner acceptance and contact release | Pass | The owner accepted the pending booking in the app. Staging audit history recorded `pending → accepted`; both owner and customer screens showed “Booking confirmed.” The accepted customer view exposed the driver call action, and the authenticated `get_booking_driver_contact` RPC returned a contact. No call was placed. |
| Customer cancellation and audit | Pass | The customer selected “Plans changed” in the app. Status became `cancelled`, the call action disappeared, and history recorded `accepted → cancelled` with `reasonPlansChanged`. |
| Owner push opt-out | Pass | “Turn off booking alerts on this phone” removed the staging push token; final token count is zero. |
| Live customer UI booking | Pass | Customer manually entered `QAMarket`; Photon returned “No places found” while preserving the manual fallback. Trip details for 13 Oct 09:00/4 hours found one verified SUV at ₹220/hour and ₹880 estimated cash fare. The review screen matched those details, and submitting showed “Booking request received.” A later refresh displayed “No reply in time”; staging history recorded `pending → expired` with `system_expiry`. |
| Same request-key retry | **Fail — booking idempotency** | Repeating an otherwise identical booking INSERT immediately with the same `request_key` returned PostgreSQL `P0001`, “This cab already has a booking around that time,” instead of the existing booking. `createCloudBooking` retries only on unique-violation `23505`, so this conflict order defeats its intended idempotent recovery. The test booking was cancelled afterward. |

**Final staging state:** one approved and available synthetic SUV; five approved synthetic document records; zero push tokens after opt-out; zero pending bookings. The three QA bookings are two cancelled and one expired. Phone confirmation remained enabled. Test account passwords and the local admin credential file remain in mode-600 `/tmp` files and are not committed.

**Still not established by this emulator pass:** a real-person selfie camera upload and genuine identity review, automatic booking-trigger push dispatch, an Expo delivery receipt, push on a physical Android device, production backend parity, SMS delivery, and the broader offline/concurrency/security matrix. Automatic approval review rejected a separate direct Expo receipt probe because it would export the device token and booking ID to Expo without specific authorization; no direct probe was sent.
