// Build-time data fetch. Runs under Bun, locally (`bun run fetch`) and in the GitHub Action before `vite build`.
// The browser never calls Launch Library; it loads the JSON this writes. See docs/adr/0002-scheduled-build-fetch.md.
import { feedIcs } from '../src/ics.ts'
import { toLaunch, type LL2Launch } from '../src/launches.ts'

// WHY: mode=detailed is the only mode that carries webcast links; hide_recent_previous drops launches
// from the last 24 h that the endpoint otherwise includes "for convenience".
const ENDPOINT =
  'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?mode=detailed&hide_recent_previous=true&limit=20'
const OUT = new URL('../public/launches.json', import.meta.url)
const ICS_OUT = new URL('../public/launches.ics', import.meta.url)

const res = await fetch(ENDPOINT, { headers: { accept: 'application/json' } })
if (!res.ok) {
  // WHY: exit non-zero so the CI job fails and the *previous* deployment stays live.
  // Writing an empty file here would deploy a blank site over a working one.
  console.error(`Launch Library responded ${res.status} ${res.statusText}`)
  process.exit(1)
}
const data = (await res.json()) as { results: LL2Launch[] }
const launches = data.results.map(toLaunch)
const feed = { fetchedAt: new Date().toISOString(), launches }
await Bun.write(OUT, JSON.stringify(feed))
// WHY: the same data as a subscribable calendar. Rebuilt every 30 min, so a subscribed calendar sees slipped times on its own.
await Bun.write(ICS_OUT, feedIcs(launches, feed.fetchedAt))
console.log(`wrote ${launches.length} launches to ${OUT.pathname} (${(JSON.stringify(feed).length / 1024).toFixed(1)} KB)`)
