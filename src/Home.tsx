import { lazy, Suspense, useMemo } from 'react'
import { Hero } from './Hero'
import { LaunchList } from './LaunchList'
import { padsOf } from './launches'
import type { LaunchFeed } from './useLaunches'

// WHY (bundle-dynamic-imports): Three.js and the coastline data are ~150 KB gzipped. Lazy-loading the globe means the
// countdown and the list render first; the globe fills in when its chunk arrives.
const Globe = lazy(() => import('./Globe').then((m) => ({ default: m.Globe })))

export function GlobeFallback() {
  return <div aria-hidden="true" className="h-full w-full animate-pulse bg-[radial-gradient(circle_at_center,var(--border)_0,transparent_60%)] motion-reduce:animate-none" />
}

export function Home({ feed, error, now }: { feed: LaunchFeed | null; error: string | null; now: number }) {
  const launches = feed?.launches
  const next = launches?.[0] ?? null
  // WHY (rerender-dependencies): memoised so the globe, which is React.memo, sees the same array each tick.
  const pads = useMemo(() => padsOf(launches ?? []), [launches])
  return (
    <>
      <title>Space Launches · next 20 orbital launches</title>
      <section className="grid gap-6 lg:grid-cols-[1fr_minmax(300px,400px)]">
        {next ? (
          <Hero launch={next} now={now} />
        ) : (
          <p className="text-muted-foreground">{error ? `Could not load launches (${error}). Reload the page to retry.` : 'Loading launches…'}</p>
        )}
        <div className="aspect-square border border-border lg:aspect-auto">
          <Suspense fallback={<GlobeFallback />}>
            <Globe pads={pads} focusId={next?.id ?? null} className="h-full w-full" />
          </Suspense>
        </div>
      </section>
      {launches ? <LaunchList launches={launches} now={now} /> : null}
    </>
  )
}
