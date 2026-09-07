# 10 — Trajectory animation on the launch page

Status: resolved
Blocked by: 07, 09

## Delivers

The launch page's globe faces the pad and animates an **illustrative** ascent: the path leaves the pad along the launch heading, climbs over ~30° of downrange travel, and settles into the target orbit (circle for LEO/SSO/PO/MEO, ellipse for GTO, departure leg for Moon/Mars), then loops. Heading and inclination come from `orbitFrame`/`orbitProfile` (pad latitude + orbit type). Ascent drawn bright, orbit dimmer, a moving point at the head. Caption: "Illustrative ascent profile from <pad> to <orbit>, inclination <i>°. Not flight data." Respects `prefers-reduced-motion` (static full path, no moving point).

## Done when

- Cape → ISS-type LEO climbs north-east; Vandenberg → SSO heads south; Kourou → GTO shows the ellipse
- Animation loops without leaking geometry; unmount stops the loop
- Caption states the illustrative nature and the inclination

## Learn

- **Why no real trajectory**: providers publish hazard areas and rough azimuths, not state vectors; LL2 has none. Honest labelling beats fake precision.
- **Inclination ≥ latitude**, prograde vs retrograde, why SSO is ~97.5° and why it goes south from coastal pads.
- **GTO vs GEO**: the rocket leaves the payload in an ellipse; the satellite's own engine circularises at apogee.
- **Animating a line**: `setDrawRange` on a BufferGeometry reveals a precomputed path without rebuilding it each frame.
- **`prefers-reduced-motion` for canvases**: CSS can't pause WebGL; the component has to check the media query itself.

## Comments

- 2026-09-07 — Done. Launch page globe gets `trajectory={lat, lon, orbitAbbrev}`; bright ascent line, dim orbit line, moving head revealed via `setDrawRange`, loops with a pause; reduced-motion shows the full static path. Caption states inclination and 'not flight data'. Also on the page: Watch live button, YouTube embed (nocookie) when applicable, Add to calendar (.ics with 15-min alarm), pad map link, facts, photo credit, mission patch.
- 2026-09-07 — Superseded the same day: Hiba found the drawn orbit "weird" and asked for SpaceX-style launch steps instead. Replaced by the Launch sequence timeline (ticket 11). The globe stays as the launch-site panel without trajectories.
