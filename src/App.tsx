import { useState } from 'react'
import { Hero } from './Hero'
import { LaunchTable } from './LaunchTable'
import type { Launch } from './launches'
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
      <header className="flex items-baseline justify-between border-b border-border pb-3 text-xs uppercase tracking-widest text-muted-foreground">
        <h1>space-launches</h1>
        <span>next {launches.length || 20} orbital launches</span>
      </header>
      {selected ? (
        <Hero launch={selected} now={now} />
      ) : (
        <p className="text-muted-foreground">{error ? `Could not load launches: ${error}` : 'Loading launches…'}</p>
      )}
      <LaunchTable launches={launches} now={now} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
    </main>
  )
}
