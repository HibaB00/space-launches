# ADR-0001: Launch Library 2 as the only data source

Date: 2026-09-07 · Status: accepted

## Context

We need upcoming launches worldwide with time, precision, window, status, pad location, rocket, provider, mission description/type/orbit and webcast links. Researched on 2026-09-07: Launch Library 2 (The Space Devs), RocketLaunch.Live, the r/SpaceX API, NASA open APIs, Space Launches Live, Next Spaceflight's calendar feed, Spaceflight Now.

## Decision

Use **Launch Library 2 v2.3.0** (`https://ll.thespacedevs.com/2.3.0/launches/upcoming/`) and nothing else. `mode=detailed` because webcast links (`vid_urls`) are only in that mode. `hide_recent_previous=true` because the endpoint otherwise includes launches from the last 24 h. `limit=20`.

## Why

- Only source carrying every field we need, including `net_precision` and pad lat/lon.
- Keyless, CORS-open, community-maintained, the upstream for most launch apps.
- r/SpaceX API: archived June 2026, endpoints return errors. NASA: no launch-schedule API. RocketLaunch.Live free tier: next 5 only, no pad coordinates. Space Launches Live: LL2 repackaged, no CORS. LL2's own `.ics` feed returned HTTP 500.

## Consequences

- Free tier is 15 requests/hour **per IP**. This drives ADR-0002 (fetch at build time, not in the browser).
- `lldev.thespacedevs.com` mirrors the API without limits but with days-stale data; useful for bulk fixture work only.
- Data quality varies by provider: Chinese launches often have `mission.description = "Details TBD."` and hour-level precision. The UI must degrade gracefully (ticket 02's precision handling).
