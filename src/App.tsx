import { useState } from 'react'
import { Hero } from './Hero'
import { LaunchTable } from './LaunchTable'
import type { Launch } from './launches'
import { LOCAL } from './time'
import { useLaunches } from './useLaunches'
import { useNow } from './useNow'

// WHY (rerender-memo-with-default-value): a module-level empty array keeps the "no data yet" prop
// referentially stable, so memoised children (the globe, later) don't see a new [] every render.
const NO_LAUNCHES: Launch[] = []

export default function App() {
  const { feed, error } = useLaunches()
  const now = useNow()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const launches = feed?.launches ?? NO_LAUNCHES
  // WHY (rerender-derived-state-no-effect): the selected launch is computed here from launches + selectedId.
  // No effect copies it into state, so it can never drift from the list. Default is the nearest launch:
  // the API returns them sorted by NET, so that's index 0.
  const selected = launches.find((l) => l.id === selectedId) ?? launches[0] ?? null

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* WHY: keyboard users can jump past the hero straight to the list; visible only when focused. */}
      <a
        href="#launches"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
      >
        Skip to launch list
      </a>
      <header className="flex items-baseline justify-between border-b border-border pb-3 text-xs uppercase tracking-widest text-muted-foreground">
        <h1>space-launches</h1>
        <span>next {launches.length || 20} orbital launches</span>
      </header>
      {/* WHY: hero and globe side by side from lg up, stacked below; the globe slot is filled in ticket 07. */}
      <section className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,360px)]">
        {selected ? (
          <Hero launch={selected} now={now} />
        ) : (
          <p className="text-muted-foreground">{error ? `Could not load launches (${error}). Reload the page to retry.` : 'Loading launches…'}</p>
        )}
        <aside
          aria-label="Launch sites globe"
          className="flex aspect-square items-center justify-center border border-border text-xs uppercase tracking-widest text-muted-foreground"
        >
          globe · ticket 07
        </aside>
      </section>
      <div id="launches">
        <LaunchTable launches={launches} now={now} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
      </div>
      {feed ? <Footer fetchedAt={feed.fetchedAt} now={now} /> : null}
    </main>
  )
}

// WHY: the deploy cron runs every 30 min. Data older than 90 min means three runs were missed, which is the
// only way this page can notice that the scheduled job stalled (GitHub pauses crons after 60 idle days).
const STALE_MS = 90 * 60_000

function Footer({ fetchedAt, now }: { fetchedAt: string; now: number }) {
  const stale = now - Date.parse(fetchedAt) > STALE_MS
  return (
    <footer
      className={`border-t border-border pt-3 text-xs uppercase tracking-widest ${stale ? 'text-foreground' : 'text-muted-foreground'}`}
    >
      data as of <time dateTime={fetchedAt}>{LOCAL.format(new Date(fetchedAt))}</time>
      {stale ? ' · stale: refresh job may have stalled' : ''} · source: launch library 2
    </footer>
  )
}
