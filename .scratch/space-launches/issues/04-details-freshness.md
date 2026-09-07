# 04 — Details and freshness

Status: resolved
Blocked by: 03

## Delivers

The selected row renders a detail `<tr colSpan>` beneath it: mission description, type, orbit, provider, pad + map link, webcast link, grouped with `Separator`. Footer shows "data as of HH:MM" from `fetchedAt`, styled as a warning when older than 90 minutes. `useLaunches()` re-fetches `./launches.json` every 10 minutes.

## Done when

- Clicking a row on a 390 px viewport shows details without scrolling to the hero
- Editing `fetchedAt` in `public/launches.json` to 2 h ago shows the warning
- Interval is cleared on unmount (StrictMode double-mount shows no duplicate fetches)

## Learn

- **Effect cleanup**: why `useEffect` returns a function and what StrictMode's double invoke is checking.
- **Staleness as a UI concern**: the page can't know if the cron died, but it can show its own data's age.
- **Table semantics**: `colSpan` detail rows keep the table valid HTML and screen-reader navigable.
- Aerospace: **mission type** taxonomy (Communications, Earth Science, Human Exploration, Resupply, Test Flight…); **target orbit** LEO / SSO / GTO / TLI and what altitude and inclination roughly mean.

## Comments

- 2026-09-07 — Done. Detail row as a second `<tr colSpan=5>` under the selected row with description, type, orbit, provider, pad (map link), local time at the pad (IANA zone from LL2, one cached formatter per zone), launch window when it isn't instantaneous, webcast host. Shared Intl formatters moved to `src/time.ts`. `useLaunches` re-fetches every 10 min with `cache: 'no-cache'`, keeps the old feed on failure. Footer shows data age and flags > 90 min as stale.
