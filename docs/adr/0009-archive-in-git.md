# ADR-0009: Flown launches are archived in a JSON file that carries over between deployments

Date: 2026-10-09 · Status: accepted

## Context

A launch vanished from the site the moment it flew: the upcoming feed drops it, its page returned "no such launch", and every calendar event that linked to the page (ADR-0005) broke within hours. Hiba also wants to look back: outcomes, landings, a history.

## Decision

- The fetch script also requests `launches/previous` (the last 20 flown, one extra request per build) and merges them into `public/past.json`, upsert by id, newest liftoff first, nothing ever dropped (`src/archive.ts`, tested).
- Nothing in CI pushes to the repository (Hiba's rule: only they push) and nothing is committed: the archive carries over through the deployed site. The fetch script merges the live `past.json` from the previous deployment with the copy already on the machine, then today's flown launches. The file is generated and git-ignored, like `launches.json`.
- The page loads both feeds. A launch's URL resolves from the upcoming feed first, then the archive, so links outlive the launch. A flown launch shows its outcome (Success, Failure, Partial Failure) where the status badge was, "Lifted off" instead of a countdown date, "Watch replay", the landing result per booster, and no calendar buttons. The home page gets a "Recent" panel.

## Why git, not a database

- The site's premise is nothing to run or pay for (ADR-0002). A file in git keeps that: no service, no credentials, no schema.
- The data is append-only and small (about 4 KB per launch, a few launches a day). Years of history fit in one file.
- The deployed site is itself the persistent store between builds; no token with write access to the repository exists in CI.

## Consequences

- If a deployment is lost (Pages disabled, a failed build chain), the archive restarts from the last 20 flown. A committed seed file was tried and removed the same evening (Hiba: "why do we have past.json"): it was a fallback for a rare case at the cost of a 110 KB file in every diff.
- The archive starts at the day this shipped and grows from there; older launches need a one-off backfill (page through `launches/previous` with `offset`) if ever wanted.
- A flown launch's record keeps updating for a few days as LL2 editors add outcomes and log entries; the upsert takes the newer copy.
- Rejected: a bot commit from CI (built, then removed the same evening: Hiba wants to be the only one who pushes); fetching `previous` at page load (spends the visitor's LL2 quota, breaks when LL2 is down); a hosted database (a service to run); baking the archive into the JS bundle (grows without bound).
