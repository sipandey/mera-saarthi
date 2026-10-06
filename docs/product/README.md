# Product and engineering handoff

**Snapshot:** 6 Oct 2026
**Product:** Mera Saarthi, Android-first cab booking for a one-town Indian pilot  
**Status key:** `Implemented` means present in the app/source; `Rollout pending` means the code depends on unapplied/unverified backend or operator setup; `Partial` means some acceptance criteria are missing; `Deferred` means intentionally outside the first pilot.

## Start here

1. Read [requirements and MVP scope](requirements-and-mvp.md) before changing product behavior.
2. Read [current application map](current-state.md) to find the owner of each flow and the current operational limits.
3. Use the [epics and stories](../plans/prd-backlog-implementation.md) for acceptance criteria, implementation references, status, and demo evidence; use the [roadmap](../plans/prd-mvp-roadmap.md) for sequencing and release gates.
4. Follow repository rules in `AGENTS.md`, `.agent-room/guardrails.md`, `.agent-room/decisions.md`, and `.agent-room/anti-patterns.md`.
5. For release work, start with the [market-readiness audit](../research/2026-10-06-market-readiness-audit.md) and [EP-08 launch plan](../plans/2026-10-06-market-readiness-plan.md).
6. For the current free map/geocoding assessment, see [map and place-search options](../research/2026-10-06-map-and-geocoding-options.md).

## Source-of-truth order

- `AGENTS.md` and `.agent-room/*` govern repository workflow and durable engineering decisions.
- `docs/product/requirements-and-mvp.md` defines current approved product scope.
- `docs/plans/prd-mvp-roadmap.md` defines the prioritized roadmap and story status.
- `docs/product/current-state.md` describes what the checked-out implementation actually does.
- `README.md` is the operator setup guide. Keep setup instructions consistent with the product docs.
- `docs/research/*` and the dated driver-verification plan are research/design history, not current requirements. Use them for rationale, then confirm details against the product docs and code.

The source PRD cited by the earlier gap review (`Local Cab Booking App — Product Requirements Document`, v1.0, 29 Sep 2026) is not checked into this repository. This handoff reconciles the repository, the existing PRD gap review, and subsequent user decisions. If the original PRD is added later, record any conflicts here instead of silently overriding the approved decisions below.

## Working agreements for future coding agents

- Keep story IDs stable. When implementation changes, update the story's state and file/demo references in the same change.
- Mark `Implemented` only for code that exists. Keep `Rollout pending` separate from code status; never infer that a Supabase migration or Edge Function is deployed because its file exists.
- Preserve the fail-closed booking eligibility rules and private identity-document boundary in [current application map](current-state.md).
- Treat demo data as synthetic. Demo coverage proves local state transitions and presentation; it does not prove camera, Storage, RLS, Edge Function, device notification, or production behavior.
- Do not expand the first-pilot scope with deferred features to work around an unfinished P0 story. Record a new story and rationale first.
- Update the roadmap and current-state map whenever a user-facing workflow or server contract changes. Record non-obvious architecture decisions in `.agent-room/decisions.md`.

## Current delivery caveat

The worktree contains the driver/vehicle verification and photo implementation plus its migrations. Authenticated Supabase CLI inspection on 6 Oct 2026 found the configured Production migration ledger through `20261006000600`; the production booking trigger is enabled and `send-booking-request` is deployed. Firebase client config and EAS FCM V1 credentials are present; physical-device push validation remains outstanding. An isolated Mumbai staging project has the full local migration chain and an Android API 35 emulator smoke build. The staging booking push function passes a synthetic lookup/skip request after applying the least-privilege service-role grants; the same migration is now applied in production, where the needed effective access was already present. Actual owner push delivery remains unverified. See the [Android QA results](../research/2026-10-06-android-qa-results.md). The 6 Oct re-audit also found missing release configuration, privacy/support/account-deletion surfaces, and a relational blocker for deleting accounts that have booking history. Review [EP-04 research](../research/2026-10-05-ep04-research.md) and the [market-readiness audit](../research/2026-10-06-market-readiness-audit.md) before rollout. See [current application map](current-state.md).
