# Anti-Patterns Log — mera-saarthi

Negative knowledge: things that have already gone wrong here, so nobody
(human or agent) repeats them. One avoided bug is worth more than one
polished example — keep entries short and concrete.

Append a new entry every time:
- a bug slips through and you find the root cause,
- an approach seemed reasonable but turned out wrong,
- a fix gets reverted because it only patched a symptom.

## Format

```
### YYYY-MM-DD — short title

**What happened:** one or two sentences.
**Root cause:** the actual cause, not the symptom.
**Avoid:** the concrete rule that would have prevented it.
```

<!-- Entries go below this line, newest first. -->

### 2026-10-02 — do not let pending requests block slots forever

**What happened:** A pending booking was treated as an active slot conflict indefinitely, even when its owner stopped using the app.
**Root cause:** The database had no expiry timestamp/state and the slot trigger considered every pending row active.
**Avoid:** Give pending requests a server expiry, exclude stale pending rows inside the slot trigger, and record the terminal transition on refresh or scheduled cleanup.

### 2026-10-01 — do not bias autocomplete to a fixed point

**What happened:** Place suggestions could favor the wrong part of India before the user shared device location.
**Root cause:** Search requests used a fixed central-India point with a neighborhood-scale zoom.
**Avoid:** Restrict India-wide searches by country first; apply a nearby-location bias only after the user chooses to share their location.

### 2026-10-01 — check the rendered screen before debugging Maps

**What happened:** The customer app was described as having a map, but no map appeared in its current booking flow.
**Root cause:** The Maps dependency and setup instructions remained while the customer screen did not render a `MapView`.
**Avoid:** Confirm a map component is part of the active screen before investigating API keys; remove stale map setup when the product flow no longer uses a map.
