import { useEffect } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router'
import { Home } from './Home'
import { LaunchPage, NotFound } from './LaunchPage'
import { LOCAL } from './time'
import { useLaunches } from './useLaunches'
import { useNow } from './useNow'

export default function App() {
  const { feed, error } = useLaunches()
  const now = useNow()
  return (
    // WHY: basename is Vite's base. Same sub-path problem as asset URLs, one layer up: the router must know the
    // app lives under /space-launches/ or every route would be off by that prefix.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollToTop />
      <main className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
        <a
          href="#launches"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
        >
          Skip to launch list
        </a>
        <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3 text-xs uppercase tracking-widest text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Space Launches
          </Link>
          <span className="flex gap-4">
            <span>next 20 orbital launches</span>
            <a
              href={`${import.meta.env.BASE_URL}launches.ics`}
              title="Subscribe in your calendar app to get every launch with a 15-minute reminder; times update when they slip."
              className="underline underline-offset-4 hover:text-foreground"
            >
              calendar feed
            </a>
          </span>
        </header>
        <Routes>
          <Route path="/" element={<Home feed={feed} error={error} now={now} />} />
          <Route path="/launch/:id" element={<LaunchPage feed={feed} now={now} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {feed ? <Footer fetchedAt={feed.fetchedAt} now={now} /> : null}
      </main>
    </BrowserRouter>
  )
}

// WHY: browsers keep the scroll position on client-side navigation; opening a launch from the bottom of the list
// would land mid-page. Scrolling the window is an external side effect, so an effect is the right tool here.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
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
      {stale ? ' · stale: refresh job may have stalled' : ''} · source: launch library 2 · photos © their credited owners
    </footer>
  )
}
