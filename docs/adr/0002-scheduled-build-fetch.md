# ADR-0002: Static site with a scheduled build-time fetch

Date: 2026-09-07 · Status: accepted

## Context

The page needs launch data that changes a few times a day. Options: (A) browser fetches LL2 directly with a localStorage cache; (B) a scheduled job fetches LL2, writes `launches.json`, rebuilds and redeploys the static site; (C) both; (D) a serverless caching proxy.

## Decision

**(B).** `scripts/fetch-launches.ts` (Bun) fetches once, maps records to a trimmed view model and writes `public/launches.json`. A GitHub Action runs it on push, every 30 minutes by cron, and on manual dispatch, then runs `vite build` and deploys to GitHub Pages. The browser only ever loads `./launches.json` from the same origin.

## Why

- Visitors never spend LL2's per-IP quota, and the page works even when LL2 is down.
- The JSON is ~20 KB instead of ~600 KB because the script trims it.
- No cache code in the browser; the CDN is the cache.
- Learning value: build-time data ("JAMstack") and cron workflows are patterns worth knowing.

## Consequences

- Data is up to 30 minutes stale. The countdown still ticks live because it derives from the stored time. A footer shows the data's age and warns past 90 minutes.
- Costs Actions minutes: ~1400/month at 30-minute cadence on a private repo (2000 free). Mitigation: hourly cadence or make the repo public. Marked `ponytail:` in the workflow.
- GitHub disables scheduled workflows after 60 days without repo activity. The stale warning is the detection mechanism.
- Rejected (A) because a fresh visitor with an empty cache sees nothing if LL2 is down and every visitor IP is quota-limited. Rejected (C) as two code paths for marginal freshness. Rejected (D) as another platform to run.
