// Build-time data fetch. Runs under Bun, locally (`bun run fetch`) and in the GitHub Action before `vite build`.
// The browser never calls Launch Library; it loads the JSON this writes. See docs/adr/0002-scheduled-build-fetch.md.
import { mergeArchive } from '../src/archive.ts'
import { feedIcs } from '../src/ics.ts'
import { toLaunch, type LL2Launch } from '../src/launches.ts'

// WHY: mode=detailed is the only mode that carries webcast links; hide_recent_previous drops launches
// from the last 24 h that the endpoint otherwise includes "for convenience".
const UPCOMING = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?mode=detailed&hide_recent_previous=true&limit=20'
// WHY: the last 20 flown launches carry the outcome, the landing result and the final mission log. Merged into a
// committed archive so a launch keeps its page after it flies (docs/adr/0009-archive-in-git.md). Two requests per
// build, four per hour at the 30-minute cadence, against LL2's 15 per hour per IP.
const PREVIOUS = 'https://ll.thespacedevs.com/2.3.0/launches/previous/?mode=detailed&limit=20'
const OUT = new URL('../public/launches.json', import.meta.url)
const ICS_OUT = new URL('../public/launches.ics', import.meta.url)
const ARCHIVE = new URL('../data/past.json', import.meta.url)
const PAST_OUT = new URL('../public/past.json', import.meta.url)

async function fetchLaunches(url: string): Promise<LL2Launch[]> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    // WHY: exit non-zero so the CI job fails and the *previous* deployment stays live.
    // Writing an empty file here would deploy a blank site over a working one.
    console.error(`Launch Library responded ${res.status} ${res.statusText} for ${url}`)
    process.exit(1)
  }
  return ((await res.json()) as { results: LL2Launch[] }).results
}

const fetchedAt = new Date().toISOString()
const launches = (await fetchLaunches(UPCOMING)).map(toLaunch)
const feed = { fetchedAt, launches }
await Bun.write(OUT, JSON.stringify(feed))
// WHY: the same data as a subscribable calendar. Rebuilt every 30 min, so a subscribed calendar sees slipped times on its own.
await Bun.write(ICS_OUT, feedIcs(launches, fetchedAt))
console.log(`wrote ${launches.length} launches to ${OUT.pathname} (${(JSON.stringify(feed).length / 1024).toFixed(1)} KB)`)

const previous = (await fetchLaunches(PREVIOUS)).map(toLaunch)
const archiveFile = Bun.file(ARCHIVE)
const existing: { launches: Launch[] } = (await archiveFile.exists()) ? await archiveFile.json() : { launches: [] }
const past = mergeArchive(existing.launches, previous)
// WHY: pretty-printed, one launch per diff hunk, so each archive commit reads as "this launch flew".
await Bun.write(ARCHIVE, JSON.stringify({ launches: past }, null, 1))
await Bun.write(PAST_OUT, JSON.stringify({ fetchedAt, launches: past }))
console.log(`archive: ${past.length} flown launches (${past.length - existing.launches.length} new) in ${ARCHIVE.pathname}`)

type Launch = ReturnType<typeof toLaunch>
