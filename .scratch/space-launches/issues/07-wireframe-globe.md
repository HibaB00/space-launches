# 07 — Wireframe globe

Status: ready-for-agent
Blocked by: 03 (and 06 for it to be live)

## Delivers

`src/geo.ts` + `src/geo.test.ts`: `latLonToVector3(lat, lon, r)` and coastline TopoJSON (`world-atlas` land-110m via `topojson-client`) → line-segment positions. `src/Globe.tsx` (`React.lazy`, `React.memo`, props `pads` + `selectedId`): mount effect creates renderer/scene/camera, wireframe sphere, coastline `LineSegments`, pad `Points`, rAF loop, resize listener, full dispose on unmount; second effect on `selectedId` sets the rotation target and blink. Named imports from `three`. `docs/adr/0004-globe-three-direct.md`. Pushing redeploys via the Action.

## Done when

- Cape Canaveral's point sits on Florida; Jiuquan's in the Gobi; Mahia on New Zealand's east coast
- Clicking a row eases the globe to that pad; the hero tick does **not** re-render `Globe` (React DevTools highlight)
- Three.js is a separate lazy chunk; table interactive before it loads; no console errors on unmount or resize

## Learn

- **Scene graph basics**: scene, camera, renderer, geometry + material = mesh; the render loop.
- **Spherical → Cartesian**: geodetic lat/lon to a point on a sphere; the same conversion (with an ellipsoid) is ECEF, used for ground tracks and GPS.
- **Code splitting** (`bundle-dynamic-imports`): why `React.lazy` + `Suspense` keeps 150 KB of Three.js off the critical path.
- **Imperative islands in React**: refs + effects as the escape hatch for libraries that own their own DOM/canvas.
- Aerospace: **launch site latitude** and why equatorial sites (Kourou 5°N) get a free eastward boost and why Vandenberg launches to polar/SSO orbits; **TopoJSON vs GeoJSON** as a data-format aside.

## Comments
