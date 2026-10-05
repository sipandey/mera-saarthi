---
title: Driver and vehicle verification
date: 2026-10-03
status: completed
research_doc: none (based on the user-provided product request)
branch: feature/vehicle-driver-approval
phases_total: 1
phases_completed: 1
---

# Driver and vehicle verification

## Intended admin and owner flow

1. A driver signs up and sees an identity checklist for Aadhaar and a selfie. The driver uploads each item; Aadhaar is never reduced to a stored UID number.
2. The owner adds a vehicle, its registration number, and rates. For every vehicle, the owner uploads the RC, current insurance, and current PUC and enters the two certificate expiry dates. A vehicle photo is optional and is reviewed separately; it does not gate approval or bookings.
3. Each latest file starts `pending`. The admin opens it through a short-lived private link, checks identity/photo match, RC registration match, and certificate validity, then approves it or requests a replacement with a reason.
4. The admin approves the driver only after the latest Aadhaar and selfie are approved. The admin approves each vehicle only after the driver is approved and the latest RC, insurance, and PUC are approved and current.
5. The owner turns availability on. Search and booking require an unblocked owner, approved driver, approved unblocked vehicle, complete current evidence, and owner availability.
6. Customer search shows the approved selfie as the driver photo only if the owner opts in, plus an approved vehicle photo when present. Both use short-lived signed URLs from the private evidence bucket; missing, opted-out, or unavailable photos use UI fallbacks.

The admin can review individual documents in any order, but the driver and vehicle approval actions remain disabled until their required evidence is ready. PostgreSQL also enforces those requirements so direct API calls cannot skip review. Uploading replacement evidence resets the affected review status; the previously submitted row remains available as review history, while only the newest file can satisfy approval. Vehicle approvals are independent, so a driver can have one approved vehicle and a second vehicle awaiting evidence.

## Scenarios to exercise

| Scenario | Expected outcome | Demo path |
| --- | --- | --- |
| New driver has not submitted Aadhaar or selfie | Owner stays pending; no vehicle is listed or bookable | Choose Admin; inspect Suresh's pending evidence and disabled driver approval |
| Selfie is unclear | Admin rejects with a readable-copy reason; driver can replace it; old rejected file does not count | Choose Owner → Suresh; replace selfie; choose Admin and review the new pending item |
| Driver evidence complete, vehicle evidence incomplete | Driver may be approved; vehicle approval remains unavailable and it cannot receive bookings | Admin → Amit's vehicle; insurance is rejected while RC and PUC are approved |
| Expired insurance or PUC | Vehicle drops from customer results immediately, even if its saved review statuses were approved | Admin → Meena's expired insurance; Owner → Meena to replace it with a future expiry |
| Owner replaces a current certificate | Vehicle returns to pending and unavailable; new file must be reviewed and vehicle approved again | Owner → choose an account and replace insurance/PUC |
| Registration number changes | Approved vehicle becomes pending and unavailable; the previous RC is marked stale, so a new RC must be uploaded and reviewed | Edit an approved vehicle in the demo and change the registration number |
| Driver owns multiple vehicles | Driver approval is shared; each vehicle has its own RC/insurance/PUC and approval outcome | Owner dashboard groups vehicle evidence under each vehicle |
| Admin acts out of order or a client skips UI | Database rejects driver/vehicle approval without required evidence and booking checks reject ineligible vehicles | Cloud policies/triggers; demo actions are gated by the same prerequisites |
| Owner or vehicle is blocked | Not searchable/bookable regardless of valid documents | Existing admin block controls plus database availability checks |
| Owner adds an optional vehicle photo | Admin can approve/reject it; vehicle availability and booking eligibility do not change | Owner → vehicle photo; Admin → review photo; customer card uses the approved image or the vehicle fallback |
| Approved driver has no display image available | Booking eligibility is unchanged; customer card shows an initials avatar | Demo customer results use the approved driver's synthetic selfie state and a placeholder portrait |

## Demo fixtures

- **Ramesh Kumar / Maruti Swift:** driver and all vehicle evidence approved, vehicle available. This is the positive customer search and booking path.
- **Suresh Yadav / Mahindra Bolero:** Aadhaar and vehicle docs pending, selfie rejected with an explanation, owner pending. This shows blocked approval and replacement.
- **Amit Patel / Maruti Dzire:** driver approved; RC and PUC approved; insurance rejected. This shows driver approval does not automatically approve a vehicle.
- **Meena Devi / Tata Tigor:** driver and vehicle documents were approved, but insurance has expired. The vehicle is unavailable and the expired certificate appears in the admin attention queue.
- **Ramesh Kumar / Maruti Swift:** approved selfie is shown as a synthetic driver-photo preview; an approved optional vehicle-photo record exercises the vehicle image state.
- **Suresh Yadav / Mahindra Bolero:** pending optional vehicle photo appears in the review queue but does not add another approval requirement.

Demo evidence is synthetic metadata; opening a file explains that there is no real image or identity document. Demo photo previews use placeholders rather than real portraits or vehicle images. Real camera/file selection and private signed links are cloud-only. The demo covers decision states and optional-photo review sequencing, while real document preview and customer photo access must be validated in a configured cloud environment.

## Release checks and operational follow-up

- Apply `supabase/migrations/20261003000100_driver_vehicle_verification_documents.sql` and `supabase/migrations/20261003000200_optional_public_vehicle_photos.sql` after the prior migrations.
- Verify Storage policies and five-minute signed links on a non-production Supabase project, including owner isolation and admin access.
- Confirm camera and document selection on the Android build; Expo Go may not match a development/store build's native permissions.
- Choose and document an evidence retention/deletion period before accepting real Aadhaar files. This feature currently stores files until an operator removes them.
- Ensure a blocked owner or an expired certificate cannot toggle availability back on; database view and booking checks must remain the final authority.
