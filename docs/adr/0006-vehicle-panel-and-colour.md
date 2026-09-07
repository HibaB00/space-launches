# ADR-0006: Vehicle panel with a generated schematic; meaning-only colour

Date: 2026-09-07 · Status: accepted

## Context

Hiba asked "is there a way to get the design of the rocket itself and how it is composed?" and, separately, for "a bit of colour" with GO in a colour. Launch Library's detailed records carry the vehicle configuration (length, diameter, liftoff mass and thrust, payload to LEO/GTO, stage count, reusability, first flight, cost, full flight and landing record, description, Wikipedia and manufacturer links, photo) and, per launch, the actual cores flying (serial, flight number, reused, landing plan) and any capsule (name, configuration, destination, crew). It has no engine data and no diagrams.

## Decision

- **Vehicle panel** on the launch page: spec grid, record tiles (launches, success rate, streak, landings), "Flying today" composition list (each booster with serial, flight number, flight-proven flag and landing plan; the capsule with crew count; otherwise the fairing), description behind `<details>`, credited photo, Wikipedia and manufacturer links.
- **Generated schematic** (`vehicle.ts` → `schematicLayout`, tested; `VehicleSchematic.tsx` draws it): body to scale from length and diameter on a shared scale with a 1.8 m human and a dashed Falcon 9 (70 m) reference line; body split into stages by typical proportions per stage count (LL2 has no per-stage lengths), ogive fairing or capsule nose, strap-on boosters alternated left/right; leader-line labels; dimensions annotated. Caption says "proportions from published length and diameter; the stage split is typical, not measured". No drawing when dimensions are missing.
- **Colour, meaning-only**: `--go` green (T-0 confirmed), `--caution` amber (TBC/TBD), `--nogo` red (hold), `--live` ice blue (live dot, timeline progress, Watch live, globe markers), registered as Tailwind colours. Photos in full colour. Everything else stays grey.

## Why

- Real data over invention: every number and every serial comes from LL2; the only inferred thing is the stage split, and it is labelled.
- A silhouette to scale teaches size intuition (Electron next to Falcon 9 next to a person) better than a table of metres.
- Colour with semantics (traffic-light status) is how launch control rooms use it; decorative colour would fight the photos.

## Consequences

- `launches.json` grows to ~65 KB (vehicle descriptions are long); still a single small file baked at build time.
- Schematic fidelity is deliberately low: no engines by count, no interstage detail. If real per-stage dimensions ever appear in LL2, `STAGE_SPLIT` is the one place to replace.
