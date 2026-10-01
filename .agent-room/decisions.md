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

### 2026-10-01 — put trip details after ride-type selection

**Decision:** Keep the customer home screen to pickup, local/outstation choice, cash-fare reassurance, and a single search action; collect date, time, vehicle, and distance on a separate trip-details screen.
**Why:** The Stitch taxi-stand prototype emphasizes a short first decision on mobile. Moving secondary filters to the next step reduces the amount of form work before cab discovery while preserving the existing booking data and validation.
**Rejected:** Keeping all booking fields on the home screen, because that buries the ride choice and primary action in a long scroll.

### 2026-10-01 — use the minimal create-agent-room Codex scaffold

**Decision:** Add create-agent-room 2.7.0's minimal preset with only its Codex adapter; do not add the CLI as an app dependency or initialize Git.
**Why:** The project needs durable decision, anti-pattern, and scope records without changing the Android runtime. This workspace has no Git repository, so hook-based enforcement cannot be installed under the repository workflow rules.
**Rejected:** Enabling the Git adapter now, because that would require initializing or attaching a repository first.
