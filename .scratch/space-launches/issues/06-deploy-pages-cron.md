# 06 — Deploy to GitHub Pages on a cron

Status: ready-for-human
Blocked by: 04, 05

## Delivers

`.github/workflows/pages.yml`: triggers `push` (main), `schedule: '*/30 * * * *'`, `workflow_dispatch`; steps checkout → setup-bun → `bun install --frozen-lockfile` → `bun run fetch` → `bun run build` → upload-pages-artifact → deploy-pages. Pages source set to "GitHub Actions". `// ponytail:` comment on the cron: 30 min ≈ 1400 Actions-minutes/month on a private repo (2000 free); go hourly or make the repo public if it bites.

## Done when

- Public URL renders with assets resolving under `/space-launches/`
- A scheduled run 30 min later succeeds and `fetchedAt` on the live `launches.json` advances
- `curl <pages-url>/launches.json` works from anywhere

## Learn

- **CI as a cron**: a workflow is just a scheduled shell script with a fresh machine each time.
- **GitHub Pages artifact model**: build → artifact → deploy job with `pages: write` and `id-token: write` permissions; why two jobs.
- **Scheduled-workflow gotcha**: GitHub disables cron workflows after 60 days without repo activity; the stale warning in the footer is how you'd notice.
- **Actions minutes budget**: private repos have a quota, public repos don't; cost of a 30-minute cadence.
- Aerospace: none.

## Comments

- 2026-09-07 — Workflow committed. Remaining steps are Hiba's (no pushing from the agent): `git push`, then enable Pages with source "GitHub Actions" (`gh api -X POST repos/HibaB00/space-launches/pages -f build_type=workflow` or Settings → Pages), then watch the first run in the Actions tab.
- 2026-09-07 — Workflow unchanged and still valid for revision 2 (fetch also writes launches.ics; build copies 404.html). Waiting on Hiba: `git push`, then enable Pages (source: GitHub Actions).
