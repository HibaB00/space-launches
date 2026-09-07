# 02 — Pure launch model + countdown formatter, tested

Status: ready-for-agent
Blocked by: 01

## Delivers

`src/launches.ts`: TypeScript types for the LL2 subset we read, the trimmed `Launch` view model (incl. pad lat/lon, timezone, map URL, webcast), `toLaunch(raw)`, `countdownMode(launch, now)` → `tick | tplus | net-date | hold | tbd`, `formatCountdown(ms)` → `T-02d 04h 17m 33s`, and `formatNet(launch)` → `NET 7 Oct` / `NET Sep 2026` / `NET Q3 2026` by precision. `src/launches.test.ts` runs against `src/fixtures/upcoming.json` (already saved: 20 real launches). `bun test` green. Glossary seeded in `CONTEXT.md`.

## Done when

- Tests cover: mapping of one Go/SEC launch and one TBD/M launch; every precision abbrev in the fixture maps to a mode; day/hour/minute/second boundaries in `formatCountdown`; T+ when net is past; fixed-width output.
- `toLaunch` never throws on any of the 20 fixture records (some have `mission.description = "Details TBD."`, empty `vid_urls`).

## Learn

- **View model**: mapping a 30 KB upstream record to the 15 fields the UI needs, and why the mapping lives in the fetch script (small JSON, upstream shape isolated to one file).
- **Pure functions and seams**: why these functions take `now` as a parameter (testable without fake timers) and never touch `Date.now()` themselves.
- **Fixture-based tests**: one real response beats hand-written mocks for catching shape surprises.
- Aerospace: **NET** (no earlier than) vs a firm T-0; **net_precision** (LL2 marks whether a time is known to the second, minute, hour, day, month or quarter); **T-minus / T-plus** conventions; **status vocabulary** Go / TBC (awaiting official confirmation) / TBD / Hold.

## Comments
