# ADR-0004: Three.js used directly for the globe; illustrative trajectories

Date: 2026-09-07 · Status: accepted (trajectory drawing **superseded** the same day, see below)

## Context

Hiba wanted a 3D centrepiece: a globe of launch sites, and on each launch page an animation of the trajectory. No public source provides trajectories (providers publish hazard areas and rough azimuths, Launch Library has none).

## Decision

- **Three.js directly**, inside one `useEffect` with a canvas ref, not react-three-fiber. One globe with a few thousand line segments does not need a React reconciler for the scene graph, and plain Three.js is the more transferable skill. Named imports only (`bundle-barrel-imports`).
- **Lazy chunk** (`React.lazy` + `Suspense`): Three.js plus the coastline data is ~150 KB gzipped; the countdown renders first.
- **Coastlines from `world-atlas` land-110m TopoJSON, decoded by hand**: every TopoJSON arc is already a coastline polyline, so we integrate the delta-encoded arcs into line segments and never build polygons. No topojson-client.
- **Occluding sphere**: a solid near-black sphere just under the lines hides the far hemisphere. This is what makes a wireframe globe legible.
- **Trajectory is illustrative and labelled so.** `orbitProfile(orbitAbbrev, padLat)` gives an inclination that is never below the pad latitude (the real constraint), 97.5° retrograde for sun-synchronous, an ellipse for GTO, a departure leg for Moon/Mars. `orbitFrame` derives the launch heading (north-east for prograde, south for retrograde). `trajectoryPoints` draws a 30° ascent then one orbit. The caption on the page says "not flight data".
- **Reduced motion**: CSS cannot pause WebGL, so the component reads `prefers-reduced-motion` itself and shows the full static path.

## Consequences

- `geo.ts` is pure and tested (orthonormal frames, headings, inclination floor, arc decoding on the real file); `Globe.tsx` is untested imperative glue.
- Drag-to-rotate via OrbitControls (rotate only). The camera eases to face the focused pad; once it arrives the user owns the camera.
- Compressed radii (LEO 1.08 R, GTO apogee 1.9 R vs the real 6.6 R) so everything fits in a square panel. Documented in code.

## Superseded in part (2026-09-07, later)

The illustrative ascent-and-orbit animation was removed after Hiba's review ("the animation for the launch is weird, it should not be a globe; check how SpaceX does the steps for a launch"). It was replaced by the **Launch sequence** timeline built from Launch Library's published `timeline` events (ADR-0006 era, ticket 11), which is real data, and the globe remains as the launch-site panel (pads, focus marker, coastlines, and a precomputed land dot grid so inland pads read as land). The orbit maths (`orbitProfile`, `orbitFrame`, `trajectoryPoints`) was deleted rather than left unused; the aerospace facts it encoded (inclination ≥ pad latitude, retrograde SSO) live on in `CONTEXT.md`.
