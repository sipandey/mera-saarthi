# Map and place-search options

**Reviewed:** 6 Oct 2026  
**Product context:** Android-first, one-town pilot; pickup currently uses Photon autocomplete; booking does not need route distance or live tracking.

## Recommendation

Use the existing Photon search for both pickup and outstation destination text suggestions. It is already integrated, supports search-as-you-type and multilingual results, and needs no additional app SDK, API key, or billing configuration. Preserve manual entry when the service has no results or is unavailable. The public Photon demo is suitable only for reasonable pilot request volumes: the maintainers can throttle it and provide no availability guarantee. Move to a managed geocoder or an operator-hosted instance before material public traffic.

Do not add an interactive map in this change. MapLibre React Native is a free, open-source map renderer and fits the current React Native version, but it does not provide production map data or tile hosting. A map still needs a style/tile source, native integration and rebuild, visible attribution, network behavior, and an availability plan. The app has no selected tile host or map-specific operating budget.

## Options reviewed

| Option | What is free | Constraint | Fit now |
|---|---|---|---|
| Photon public demo (`photon.komoot.io`) | Open-source geocoder; public demo accepts reasonable API use | Extensive usage may be throttled or banned; no uptime guarantee or change notice | Good for low-volume autocomplete; already used by pickup search |
| MapLibre React Native + OSM standard raster tiles | MapLibre renderer and OSM data | OSM tile servers are donation-funded, best-effort, and have no SLA. Clients must attribute OSM, identify the app, honor caching, and avoid bulk/offline downloads. | Possible for a small interactive pilot after verifying native request identification and caching; not a dependable production tile-hosting plan |
| MapLibre + self-hosted tiles/style | Open-source renderer and server stack | Operator provisions, updates, monitors, and pays for hosting/storage; global datasets can be large | Consider when an operator is ready to own map infrastructure |
| MapLibre + managed OSM-derived tile provider | Often has a trial or free allowance | Terms and free quotas vary and can change; may require account, key, or billing details | Re-evaluate once provider limits and expected pilot traffic are known |

## Implementation in this change

- Reuse the existing India-restricted Photon suggestions for outstation destination.
- Keep manual destination entry available during lookup failure and when users do not choose a suggestion.
- Keep the device-location action pickup-only; ordinary destination text search does not need location permission.
- Keep route calculation, map display, and distance-based fare estimates out of scope.

## Sources

- [Photon project and public demo terms](https://github.com/komoot/photon)
- [Photon API documentation](https://github.com/komoot/photon/blob/master/docs/api-v1.md)
- [MapLibre React Native setup](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/)
- [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
