# 07 — Wireframe globe

Status: resolved
Blocked by: 03

## Delivers

`src/geo.ts` (pure, tested): `latLonToVec3`, `coastlineSegments` (decodes world-atlas TopoJSON arcs directly, no topojson-client), `graticuleSegments`, `orbitProfile`, `orbitFrame`, `trajectoryPoints`. `src/Globe.tsx` (`React.lazy`, `React.memo`): Three.js in a mount effect: transparent renderer, occluding near-black sphere, graticule every 15°, coastlines, pad points, selected pad ring; camera eases to face the selected pad; drag to rotate (OrbitControls, rotate only); rAF loop, ResizeObserver, full dispose on unmount. Optional `trajectory` prop animates an ascent + orbit path (ticket 10). Named imports from `three`. ADR-0004.

## Done when

- Cape Canaveral's point sits on Florida; Jiuquan's in the Gobi; Mahia on New Zealand's east coast
- Selecting a launch eases the globe to its pad; the clock tick does **not** re-render `Globe`
- Three.js is a separate lazy chunk; the page is interactive before it loads; no console errors on unmount/resize

## Learn

- **Scene graph basics**: scene, camera, renderer, geometry + material = object; the render loop.
- **Occlusion trick**: a solid sphere just under the lines hides the far side, which is what makes a wireframe globe readable.
- **Spherical → Cartesian** and the Y-up convention; the same conversion with an ellipsoid is ECEF, used for ground tracks and GPS.
- **Code splitting** (`bundle-dynamic-imports`): why `React.lazy` + `Suspense` keeps ~150 KB of Three.js off the critical path.
- **Imperative islands in React**: refs + effects as the escape hatch for libraries that own their own canvas.
- Aerospace: **launch-site latitude** sets the minimum inclination; **TopoJSON** arcs vs GeoJSON polygons.

## Comments

- 2026-09-07 — Done. `Globe.tsx`: Three.js direct, lazy chunk (~159 KB gz incl. coastlines), occluding sphere, 15° graticule, coastlines decoded from world-atlas arcs (no topojson-client), pad points, blinking focus marker + ring, camera eases to the focused pad then hands control to OrbitControls (rotate only). `geo.ts` fully tested (frames, headings, inclination floor, real-file decode).
