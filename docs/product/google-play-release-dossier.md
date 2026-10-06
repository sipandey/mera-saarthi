# Google Play Console Release Dossier — Mera Saarthi

This document contains all official store listing metadata, compliance declarations, Data Safety questionnaire answers, reviewer instructions, and closed-track testing configurations required for Google Play Console submission.

---

## 1. Store Listing Details

### App Identification
- **App Name:** Mera Saarthi (मेरा सारथी)
- **Package Name (Application ID):** `in.merasaarthi.cabs`
- **Default Language:** English (India) / Hindi (`hi-IN`)
- **Category:** Travel & Local
- **Tags:** Cabs, Taxi, Rural Transportation, Village Cabs, Ride Booking

### Short Description (Max 80 characters)
> **Hindi:** विश्वसनीय ग्रामीण कैब सेवा। सीधे सत्यापित ड्राइवर से बुक करें।
> **English:** Reliable rural cab booking. Book directly with verified local drivers.

### Full Description (Max 4000 characters)

```text
Mera Saarthi (मेरा सारथी) is a reliable, community-focused cab booking service designed specifically for rural towns, villages, and local taxi stands. 

We connect local passengers directly with verified vehicle owners and taxi operators for local and outstation travel — transparently, safely, and without surge pricing.

WHY CHOOSE MERA SAARTHI?
• Direct Driver Booking: Connect directly with vehicle owners from your local stand.
• Transparent Cash Fares: No hidden charges or surge pricing. Standard per-kilometer outstation rates and fixed local fares paid in cash directly to your driver.
• Verified Vehicles and Drivers: Every driver and vehicle undergoes offline identity, RC, insurance, and PUC verification before approval.
• Simple, Map-Free Experience: Lightweight text and landmark-based pickup search that works smoothly even on 2G/3G networks and budget Android smartphones.
• Tap to Call: Direct telephone connection between passenger and driver once a booking is confirmed.

FOR PASSENGERS:
1. Enter your pickup town or village landmark.
2. Choose your ride type (Local or Outstation) and travel time.
3. Compare available verified vehicles (Hatchback, Sedan, SUV).
4. Send your ride request directly to the vehicle owner.
5. Receive direct confirmation and call the driver to coordinate your trip.
6. Pay agreed cash fare at trip completion.

FOR DRIVERS & VEHICLE OWNERS:
• Zero Commission: Keep 100% of your earnings.
• Direct Customer Connections: Receive ride requests directly on your mobile device.
• Simple Document Submission: Upload your vehicle RC, insurance, and fitness documents directly through the app for verification.
• Controlled Availability: Mark your vehicle available or busy according to your schedule.

PRIVACY & SAFETY FIRST:
• Your phone number is only shared with the driver after a booking is confirmed.
• Verification documents are securely retained only for compliance reviews and purged within 30 days.
• Delete your account and associated personal data at any time directly inside the app.

Support & Inquiries:
Email: support@merasaarthi.in
Website: https://merasaarthi.in
```

---

## 2. Store Media & Assets Checklist

| Asset | Specifications | Status |
|---|---|---|
| **App Icon** | 512 x 512 px, 32-bit PNG, max 1024 KB | Generated from assets/icon.png |
| **Feature Graphic** | 1024 x 500 px, JPG or 24-bit PNG | Pending marketing banner export |
| **Phone Screenshots** | Min 2, max 8; 16:9 or 9:16 aspect ratio (min 1080px) | Capture from Preview APK |
| **7-inch / 10-inch Tablet** | Optional for mobile-first pilot | Not required for initial closed test |

---

## 3. Data Safety Declaration (Play Console Questionnaire)

Google Play requires accurate reporting of data collection and security practices.

### General Assessment
- **Does your app collect or share any user data?** Yes.
- **Is all user data collected by your app encrypted in transit?** Yes (all API communications use HTTPS / TLS 1.3).
- **Do you provide a way for users to request that their data is deleted?** Yes (in-app closure button in Help & Privacy screen and web request form at `https://merasaarthi.in/delete-account`).

### Data Types Collected

#### A. Location
- **Approximate Location (Foreground only):**
  - *Collected?* Yes.
  - *Shared?* No.
  - *Purpose:* App functionality (detecting nearby taxi stand or pickup address suggestions when user taps "Use my location").
  - *Optional or required?* Optional (users can type manual addresses without granting location).
- **Precise Location (Foreground only):**
  - *Collected?* Yes (coordinates converted to reverse-geocoded place names via Photon/OSM).
  - *Shared?* No.
  - *Purpose:* App functionality (pickup location precision).
  - *Optional or required?* Optional.

#### B. Personal Info
- **Name:**
  - *Collected?* Yes.
  - *Shared?* Only disclosed to the booked driver/customer upon booking confirmation.
  - *Purpose:* Account management and trip coordination.
- **Phone Number:**
  - *Collected?* Yes.
  - *Shared?* Only disclosed to the other party via dialer link after a booking is accepted.
  - *Purpose:* Account authentication and ride coordination.
- **User IDs (UUID):**
  - *Collected?* Yes (system-generated account identifier).
  - *Shared?* No.
  - *Purpose:* Account management.

#### C. Photos and Videos
- **Photos:**
  - *Collected?* Yes (driver selfie and optional vehicle photos).
  - *Shared?* No (driver photo only shown to passenger if driver explicitly opts in).
  - *Purpose:* Identity verification and vehicle listing presentation.
  - *Retention:* Raw document evidence files are purged within 30 days of review.

#### D. Financial Info
- *None collected.* (App is cash-only; no payment card or bank data processed).

#### E. Files and Documents
- *Collected?* Yes (vehicle RC, insurance policy, PUC certificate uploaded for offline review).
- *Shared?* No (restricted to administrator review).
- *Retention:* 30-day purge schedule enforced by database cron worker.

---

## 4. App Access & Reviewer Instructions

Google Play reviewers require credentials to test the application:

### Test Account 1: Customer Persona
- **Phone:** `919876543210`
- **Password:** `Saarthi@2026`
- **Role:** Customer
- **Test Instructions:** Sign in to search for local or outstation cabs from the pilot taxi stand, review vehicle details, and test the Help & Privacy modal.

### Test Account 2: Approved Owner Persona
- **Phone:** `919910137705`
- **Password:** `Saarthi@2026`
- **Role:** Vehicle Owner
- **Test Instructions:** View verified vehicle listings, toggle daily availability, and view incoming ride requests.

### Test Account 3: Administrator Persona
- **Phone:** `918130380606`
- **Password:** `Saarthi@2026`
- **Role:** Stand Administrator
- **Test Instructions:** View pending document verification queues, vehicle approval states, and booking audit records.

---

## 5. Declarations & Policies

- **Target Audience:** 18 and older.
- **Ads Declaration:** "No, my app does not contain ads."
- **Government Services:** "No, this app does not represent a government entity."
- **Financial Features:** "No, this app does not provide digital financial services or online loans."
- **Privacy Policy URL:** `https://merasaarthi.in/privacy`
- **Account Deletion URL:** `https://merasaarthi.in/delete-account`
- **Support Email:** `support@merasaarthi.in`

---

## 6. Closed Pilot Testing Plan

- **Track:** Closed Testing (Alpha).
- **Initial Cohort:** 10–20 drivers and stand operators in the pilot town.
- **Rollout Mechanism:** Email list / Google Group invitation via Play Console.
- **Monitoring Window:** 14 consecutive days of operational testing before promoting to open pilot.
