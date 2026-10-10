import { useEffect } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router'
import { Home } from './Home'
import { googleSubscribeUrl } from './ics'
import { LaunchPage, NotFound } from './LaunchPage'
import { LOCAL, LOCAL_CLOCK, UTC_CLOCK } from './time'
import { FEED_URL, PAST_URL, useFeed } from './useLaunches'
import { useNow } from './useNow'

export default function App() {
  const { feed, error } = useFeed(FEED_URL)
  // WHY: the archive is a second file so the upcoming feed stays small; a missing archive only hides the Recent panel.
  const { feed: past } = useFeed(PAST_URL)
  const now = useNow()
  return (
    // WHY: basename is Vite's base. Same sub-path problem as asset URLs, one layer up: the router must know the
    // app lives under /space-launches/ or every route would be off by that prefix.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollToTop />
      <main className="min-h-screen w-full space-y-4 px-4 py-4 lg:px-6">
        <a
          href="#launches"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
        >
          Skip to launch list
        </a>
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border pb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Link to="/" className="text-foreground hover:text-live">
            Space Launches
          </Link>
          {/* WHY: launch coverage runs on UTC; the visitor lives in local time. Both clocks, seconds included, like a control-room wall. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span>
              <span className="text-foreground">{UTC_CLOCK.format(now)}</span> UTC
            </span>
            <span className="text-foreground">{LOCAL_CLOCK.format(now)}</span>
            {/* WHY: a bare .ics link downloads a file; Google's "add calendar from URL" dialog subscribes instead, so
                slipped times update on their own. It needs the deployed site: Google can't fetch localhost. */}
            <a href={googleSubscribeUrl()} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground" title="Every upcoming launch in Google Calendar; times update when they slip. Works once the site is deployed.">
              Google Calendar ↗
            </a>
            <a href={`${import.meta.env.BASE_URL}launches.ics`} className="hover:text-foreground" title="Calendar feed (.ics) for Apple Calendar, Outlook and others">
              .ics
            </a>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<Home feed={feed} past={past} error={error} now={now} />} />
          <Route path="/launch/:id" element={<LaunchPage feed={feed} past={past} now={now} />} />
          <Route path="*" element={<NotFound feed={feed} now={now} />} />
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
    <footer className={`border-t border-border pt-3 text-[11px] uppercase tracking-widest ${stale ? 'text-caution' : 'text-muted-foreground'}`}>
      data as of <time dateTime={fetchedAt}>{LOCAL.format(new Date(fetchedAt))}</time>
      {stale ? ' · stale: refresh job may have stalled' : ''} · source: launch library 2 · photos © their credited owners
    </footer>
  )
}
