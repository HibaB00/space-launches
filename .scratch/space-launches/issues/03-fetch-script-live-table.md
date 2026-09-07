# 03 — Fetch script + live hero and table

Status: resolved
Blocked by: 02

## Delivers

`scripts/fetch-launches.ts` (Bun): GET LL2 `launches/upcoming?mode=detailed&hide_recent_previous=true&limit=20`, map with `toLaunch`, write `public/launches.json` `{ fetchedAt, launches }`; `bun run fetch`. `useLaunches()` loads `./launches.json`; `useNow()` is the single 1 s clock; `Hero` shows the selected launch (default: nearest) with big T-minus, rocket, pad, status `Badge`; `LaunchTable` lists all 20 with live T-minus; clicking a row selects it. Local + UTC times via `Intl.DateTimeFormat`. Load `/vercel-react-best-practices` before writing components; review against it before commit.

## Done when

- `bun run fetch` writes ~20 KB JSON with 20 launches and `fetchedAt`
- Page ticks once per second; digits don't shift width; Network shows one `launches.json` request and none to `thespacedevs.com`
- No `useEffect` copies props/state into other state; only the interval and the fetch are effects

## Learn

- **Build-time data / JAMstack**: the site is static, yet "dynamic", because a job rebuilds it on a schedule.
- **`rerender-derived-state-no-effect`** (Vercel): selected launch and countdown strings are computed in render, not synced via effects.
- **Single clock source**: one `setInterval` and 20 derived values, instead of 20 intervals.
- **`Intl.DateTimeFormat`**: locale and time-zone aware formatting with zero libraries.
- Aerospace: **launch service provider (LSP)** vs the rocket's manufacturer; **pad vs launch site** (SLC-40 is a pad at Cape Canaveral SFS).

## Comments

- 2026-09-07 — Done. `bun run fetch` → 23 KB JSON (raw response is ~600 KB). Hooks: `useNow` (one clock), `useLaunches` (mount fetch; the 10-min refresh comes in 04). Components: `Hero`, `LaunchTable` with a module-level `LaunchRow`, `StatusBadge`. `countdownText()` added to the pure module so hero and table share one string per mode. Skipped SWR (`client-swr-dedup`): one consumer, nothing to dedupe. Rows carry a real `<button>` for keyboard users because `<tr>` can't take focus.
