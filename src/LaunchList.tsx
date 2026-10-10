import { Link } from 'react-router'
import { googleSubscribeUrl } from './ics'
import { countdownText, siteName, type Launch } from './launches'
import { Panel } from './Panel'
import { Photo } from './Photo'
import { StatusBadge } from './StatusBadge'
import { LOG_TIME } from './time'

export function LaunchList({ launches, now }: { launches: Launch[]; now: number }) {
  return (
    <div id="launches">
      <Panel
        label={`Schedule · next ${launches.length}`}
        actions={
          <a href={googleSubscribeUrl()} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
            subscribe in Google Calendar ↗
          </a>
        }
      >
        {/* WHY: gap-px over a border-coloured background draws hairlines between tiles without doubled borders. */}
        <ul className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {launches.map((launch) => (
            <li key={launch.id} className="bg-card">
              <LaunchCard launch={launch} now={now} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

// WHY: the whole card is one <a>. Middle-click, Cmd-click, keyboard focus and screen readers all work for free;
// a div with onClick would need all of that re-implemented (web-interface-guidelines: no div onClick).
function LaunchCard({ launch, now }: { launch: Launch; now: number }) {
  return (
    <Link
      to={`/launch/${launch.id}`}
      className="group flex h-full gap-4 p-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-live"
    >
      <Photo image={launch.image} thumb alt="" width={80} height={80} className="h-20 w-20 shrink-0 object-cover opacity-90 transition-opacity group-hover:opacity-100" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base whitespace-nowrap sm:text-lg">{countdownText(launch, now)}</p>
          <StatusBadge status={launch.status} />
        </div>
        <p className="truncate text-sm" translate="no">
          {launch.rocket} <span className="text-muted-foreground">·</span> {launch.mission.name}
        </p>
        <p className="truncate text-xs uppercase tracking-widest text-muted-foreground">
          {siteName(launch)} · {launch.pad.country}
        </p>
      </div>
    </Link>
  )
}

/** Flown launches from the archive, newest first: outcome badge and liftoff time instead of a countdown. */
export function RecentList({ launches }: { launches: Launch[] }) {
  return (
    <Panel label={`Recent · last ${launches.length}`} actions={<span>outcome · liftoff in your time</span>}>
      <ul className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 xl:grid-cols-4">
        {launches.map((launch) => (
          <li key={launch.id} className="bg-card">
            <Link to={`/launch/${launch.id}`} className="group flex h-full gap-4 p-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-live">
              <Photo image={launch.image} thumb alt="" width={64} height={64} className="h-16 w-16 shrink-0 object-cover opacity-75 transition-opacity group-hover:opacity-100" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <time dateTime={launch.net} className="text-sm whitespace-nowrap text-muted-foreground">
                    {LOG_TIME.format(new Date(launch.net))}
                  </time>
                  <StatusBadge status={launch.status} />
                </div>
                <p className="truncate text-sm" translate="no">
                  {launch.rocket} <span className="text-muted-foreground">·</span> {launch.mission.name}
                </p>
                <p className="truncate text-xs uppercase tracking-widest text-muted-foreground">
                  {siteName(launch)} · {launch.pad.country}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
