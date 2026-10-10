import { Component, lazy, Suspense, useMemo, type ReactNode } from 'react'
import { Hero } from './Hero'
import { LaunchList, RecentList } from './LaunchList'
import { padsOf, tabTitle } from './launches'
import { Panel } from './Panel'
import type { LaunchFeed } from './useLaunches'

// WHY (bundle-dynamic-imports): Three.js and the coastline data are ~150 KB gzipped. Lazy-loading the globe means the
// countdown and the list render first; the globe fills in when its chunk arrives.
const Globe = lazy(() => import('./Globe').then((m) => ({ default: m.Globe })))

export function GlobeFallback() {
  return <div aria-hidden="true" className="h-full w-full animate-pulse bg-[radial-gradient(circle_at_center,var(--border)_0,transparent_60%)] motion-reduce:animate-none" />
}

// WHY: three.js throws from inside an effect when WebGL is unavailable (old GPUs, some remote desktops, headless
// browsers). Without a boundary React unmounts the whole tree and the countdown vanishes with the globe.
export class GlobeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed)
      return (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,var(--border)_0,transparent_60%)] p-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          globe needs WebGL · not available in this browser
        </div>
      )
    return this.props.children
  }
}

export function Home({ feed, past, error, now }: { feed: LaunchFeed | null; past: LaunchFeed | null; error: string | null; now: number }) {
  const launches = feed?.launches
  const next = launches?.[0] ?? null
  // WHY (rerender-dependencies): memoised so the globe, which is React.memo, sees the same array each tick.
  const pads = useMemo(() => padsOf(launches ?? []), [launches])
  return (
    <>
      <title>{next ? tabTitle(next, now) : 'Space Launches · next 20 orbital launches'}</title>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        {next ? (
          <Hero launch={next} now={now} />
        ) : (
          <p className="text-muted-foreground">{error ? `Could not load launches (${error}). Reload the page to retry.` : 'Loading launches…'}</p>
        )}
        <Panel label={`Launch sites · next ${pads.length}`} live className="h-[24rem] xl:h-auto" bodyClassName="relative">
          <div className="absolute inset-0">
            <GlobeBoundary>
              <Suspense fallback={<GlobeFallback />}>
                <Globe pads={pads} focusId={next?.id ?? null} className="h-full w-full" />
              </Suspense>
            </GlobeBoundary>
          </div>
        </Panel>
      </div>
      {launches ? <LaunchList launches={launches} now={now} /> : null}
      {past && past.launches.length > 0 ? <RecentList launches={past.launches.slice(0, 8)} /> : null}
    </>
  )
}
