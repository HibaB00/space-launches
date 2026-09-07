# Spec: Space Launches — personal upcoming-launch tracker

Status: ready-for-agent
Plan: ~/.claude/plans/right-now-there-is-rosy-matsumoto.md (approved 2026-09-07)

## Problem Statement

Hiba has no single place to see what rockets are launching soon, when, from where, and why. Existing launch sites are ad-laden, cluttered, or app-only. They also want the project itself to teach them: the engineering decisions (software) and the domain (launches, orbits, sites).

## Solution

A static website: a live countdown to each of the next 20 orbital launches worldwide, showing rocket, provider, launch pad and site, status (Go / TBC / TBD / Hold), the mission's description, type and target orbit, and a webcast link. A wireframe 3D globe shows every upcoming pad and turns to face the selected launch. Black-and-white, monospace, "mission-control readout" look. Data is refreshed every 30 minutes by a scheduled build, so the page itself never calls the upstream API.

## User Stories

1. As a visitor, I want to see the next launch with a large ticking T-minus, so that I know at a glance how long until liftoff.
2. As a visitor, I want the countdown to tick every second without the digits jumping around, so that it reads like a real clock.
3. As a visitor, I want to see the rocket name and the launch provider, so that I know who is flying what.
4. As a visitor, I want to see the launch pad and the launch site with its country, so that I know where the launch is from.
5. As a visitor, I want a map link for the pad, so that I can see exactly where it is.
6. As a visitor, I want the launch time shown in my local time zone and in UTC, so that I can plan to watch and cross-reference coverage.
7. As a visitor, I want the status (Go, TBC, TBD, Hold) shown as a badge, so that I know how firm the time is.
8. As a visitor, I want launches whose time is only known to the day, month or quarter to show "NET <date>" instead of a fake countdown, so that I'm not misled by precision that isn't there.
9. As a visitor, I want a launch whose scheduled time has passed but has not been updated yet to show T+ counting up, so that the display matches launch-coverage convention.
10. As a visitor, I want a table of the next 20 launches sorted by time, each with a live T-minus, so that I can scan the schedule.
11. As a visitor, I want to click a row to select that launch, so that the hero and globe show it.
12. As a visitor, I want the selected row to expand inline with the mission description, type, orbit, provider, pad and webcast link, so that I can read the details without leaving the table (especially on a phone).
13. As a visitor, I want to know why a mission is flying (its description, type and target orbit), so that I learn what the payload is for.
14. As a visitor, I want a webcast link when one exists, so that I can watch.
15. As a visitor, I want a wireframe globe with every upcoming pad marked, so that I can see where in the world launches happen.
16. As a visitor, I want the selected launch's pad to blink and the globe to turn toward it, so that the globe and the list stay connected.
17. As a visitor, I want the page usable before the globe's code has downloaded, so that a slow connection still gets the countdown.
18. As a visitor on a phone, I want the layout to stack and the table to scroll inside its own container, so that the page never scrolls sideways.
19. As a visitor, I want to see when the data was last refreshed, so that I can judge how current it is.
20. As a visitor, I want a visible warning if the data is unusually stale, so that I know the refresh job may have stalled.
21. As a visitor with an open tab, I want the page to pick up new data on its own every 10 minutes, so that I don't have to reload.
22. As a visitor with reduced-motion preferences, I want decorative effects (scanlines, blink) disabled, so that the page respects my settings.
23. As the owner, I want the site deployed at a public URL on GitHub Pages, so that I can open it anywhere.
24. As the owner, I want launch data refreshed by a scheduled job every 30 minutes, so that visitors never spend the upstream API's per-IP quota and the page works even if the API is down.
25. As the owner, I want the whole page to work with no backend, so that there is nothing to run or pay for.
26. As the owner, I want every non-obvious decision recorded (ADRs, `// WHY:` comments, a glossary, a Learn section per ticket), so that I can learn from the project later.
27. As the owner, I want the aerospace vocabulary used in the UI defined in a glossary, so that I learn the domain as I build.
28. As the owner, I want the pure logic (record mapping, countdown rules, lat/long math) covered by tests, so that the only non-trivial code is verified.
29. As a visitor, I want to see a photo of the rocket for each launch, so that the page feels alive and I recognise vehicles.
30. As a visitor, I want each launch to have its own page with its own URL, so that I can open it directly, share it, and use the browser's back button.
31. As a visitor, I want the launch page to show an animation of the ascent into orbit on the globe, so that I get an intuition for where and how the rocket flies.
32. As a visitor, I want that animation labelled as illustrative, so that I don't mistake it for flight data.
33. As a visitor, I want the mission patch shown when one exists, so that I see the mission's own identity.
34. As a visitor, I want image credits shown, so that photographers and agencies are attributed.

_Added 2026-09-07 evening after Hiba's review of the first build: "no images, it should be a separate page with a trajectory animation, it is so plain"._

## Implementation Decisions

- **Data source**: Launch Library 2 v2.3.0 (The Space Devs), endpoint `launches/upcoming` with `mode=detailed`, `hide_recent_previous=true`, `limit=20`. No key. Rate limit 15 req/hr per IP.
- **Fetch design**: a Bun script fetches once, maps each raw record to a trimmed `Launch` view model, and writes `public/launches.json` as `{ fetchedAt, launches }`. A GitHub Action runs it on push, on a 30-minute cron and on manual dispatch, then builds and deploys. The browser only ever requests its own `./launches.json`.
- **Launch view model** (produced by the script, consumed by the page): `id`, `name`, `rocket`, `provider`, `providerAbbrev`, `mission { name, description, type, orbit }`, `net` (ISO), `netPrecision` (abbrev: SEC/MIN/HR/DAY/WK/M/Q1-4/H1-2/Y…), `windowStart`, `windowEnd`, `status { abbrev, name, description }`, `pad { name, lat, lon, location, country, timezone, mapUrl }`, `image`, `webcast` (first video URL or null), `infoUrl` (first info URL or null).
- **Countdown rules**: `countdownMode(launch, now)` returns `tick` (precision SEC/MIN/HR and net in future), `tplus` (net in past, status still Go/TBC), `net-date` (precision DAY or coarser: render "NET 7 Oct", "NET Sep 2026", "NET Q3 2026"), `hold` (status Hold), `tbd` (status TBD with coarse precision). `formatCountdown(ms)` renders `T-02d 04h 17m 33s` / `T+00d 00h 01m 09s`, always fixed-width.
- **Stack**: React 19, TypeScript, Vite 8 (`base: /space-launches/`), Tailwind v4, shadcn/ui components copied in (Table, Badge, Card, Separator only), dark-only neutral theme, radius 0, Geist Mono. Bun for install and tests.
- **State**: `launches`, `selectedId` in App state. One `useNow()` 1-second clock. `useLaunches()` fetches on mount and every 10 minutes. Everything else derived during render (Vercel `rerender-derived-state-no-effect`).
- **Globe**: Three.js used directly in a `useEffect` (not react-three-fiber), lazy-loaded, memoised, receives `pads` and `selectedId` only so the clock tick never re-renders it. Coastlines from `world-atlas` land-110m TopoJSON.
- **Routing**: React Router, `BrowserRouter` with `basename` = Vite base; routes `/` and `/launch/:id`; `dist/404.html` copy of `index.html` for GitHub Pages deep links.
- **Imagery**: LL2 `image` (url, thumbnail, credit, licence) and `mission_patches`; credit shown with every photo; gradient scrim under text on photos.
- **Trajectory**: illustrative only. `orbitProfile(orbitAbbrev, padLat)` gives inclination (never below pad latitude; SSO 97.5°), perigee/apogee (compressed radii), escape flag. `orbitFrame` builds pad/velocity/normal vectors; `trajectoryPoints` draws ascent (30° downrange) then one orbit. Labelled "not flight data".
- **Deploy**: GitHub Pages via Action (setup-bun → install → fetch → build → upload → deploy). Private repo initially.
- **Tracking**: this spec and tickets in `.scratch/space-launches/`; one Linear issue per phase; Obsidian project note for the learning log.
- **Out of v1**: notifications, .ics, past launches, accounts, database, theme toggle, provider filter, glossary tooltips. Hardware is a separate project.

## Testing Decisions

- Seam: the pure modules only. `launches.ts` (`toLaunch`, `countdownMode`, `formatCountdown`) tested with `bun test` against one real saved LL2 response (`src/fixtures/upcoming.json`, 20 launches covering SEC/MIN/HR/DAY/M/Q3 precision and Go/TBC/TBD statuses). `geo.ts` (`latLonToVector3`) tested against known points.
- No component, DOM or end-to-end tests in v1. Manual verification steps live in the plan's Verification section.
