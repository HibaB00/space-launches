# ADR-0009: Flown launches are archived as a JSON file committed by the build

Date: 2026-10-09 · Status: accepted

## Context

A launch vanished from the site the moment it flew: the upcoming feed drops it, its page returned "no such launch", and every calendar event that linked to the page (ADR-0005) broke within hours. Hiba also wants to look back: outcomes, landings, a history.

## Decision

- The fetch script also requests `launches/previous` (the last 20 flown, one extra request per build) and merges them into `data/past.json`, upsert by id, newest liftoff first, nothing ever dropped (`src/archive.ts`, tested).
- The build job commits `data/past.json` back to the repository when it changed. The same file is copied to `public/past.json` for the page.
- The page loads both feeds. A launch's URL resolves from the upcoming feed first, then the archive, so links outlive the launch. A flown launch shows its outcome (Success, Failure, Partial Failure) where the status badge was, "Lifted off" instead of a countdown date, "Watch replay", the landing result per booster, and no calendar buttons. The home page gets a "Recent" panel.

## Why git, not a database

- The site's premise is nothing to run or pay for (ADR-0002). A file in git keeps that: no service, no credentials, no schema.
- The data is append-only and small (about 4 KB per launch, a few launches a day). Years of history fit in one file.
- Every archive commit is a readable diff: "this launch flew, landed on OCISLY". That is the history Hiba wanted to learn from.
- Commits made with the Actions token do not trigger workflows, so the cron cannot loop on its own commits.

## Consequences

- The build job needs `contents: write`. Hiba's local `main` falls behind the bot's commits: `git pull --rebase` before pushing.
- The archive starts at the day this shipped and grows from there; older launches need a one-off backfill (page through `launches/previous` with `offset`) if ever wanted.
- A flown launch's record keeps updating for a few days as LL2 editors add outcomes and log entries; the upsert takes the newer copy.
- Rejected: fetching `previous` at page load (spends the visitor's LL2 quota, breaks when LL2 is down); a hosted database (a service to run); baking the archive into the JS bundle (grows without bound).
