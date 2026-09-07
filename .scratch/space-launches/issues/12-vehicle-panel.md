# 12 — Vehicle panel with schematic

Status: resolved
Blocked by: 11

## Delivers

`Launch.vehicle` (specs, record, boosters with serial/flight/landing plan, capsule with crew) mapped from LL2's configuration, launcher stages and spacecraft stage, with tests on Falcon 9, Crew-13 and a vehicle without dimensions. `vehicle.ts` `schematicLayout` (tested) and `VehicleSchematic.tsx`: body to scale beside a 1.8 m human and a 70 m Falcon 9 reference line, typical stage split, ogive fairing or capsule nose, strap-ons alternated, leader-line labels. `VehiclePanel`: spec grid, record tiles, "Flying today" composition, description behind `<details>`, credited photo, Wikipedia and manufacturer links. Also: land dot grid on the globe (`scripts/build-land-dots.ts` → `src/land-dots.json`) so inland pads read as land.

## Learn

- **Precompute what never changes**: 30,000 point-in-polygon tests once at development time, 52 KB of dots forever; the browser does none of it.
- **Even-odd point-in-polygon** with bounding-box prefilter: the classic ray-casting test, holes handled for free by parity.
- **Drawing to a shared scale**: one pixels-per-metre factor for the vehicle, the human and the reference line is what makes sizes comparable.
- **Honest inference**: the stage split is the only invented number, so it is the only thing the caption disclaims.
- Aerospace: **thrust-to-weight** (Falcon 9 ≈ 1.4 at liftoff), **flight-proven boosters and droneship landings**, **payload to LEO vs GTO** as the headline capability, **capsule vs fairing**.

## Comments

- 2026-09-07 — Done. Verified pages: USSF-153 (schematic, B1081 flight 27 → OCISLY 574 km), Crew-13 (Crew Dragon 2 capsule, 4 crew), Long March 2D/YZ-3 (no dimensions → specs only). ADR-0006.
