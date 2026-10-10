import { Link, useSearchParams } from 'react-router'
import { googleSubscribeUrl } from './ics'
import { countdownText, dayKey, siteName, type Launch } from './launches'
import { Panel } from './Panel'
import { Photo } from './Photo'
import { StatusBadge } from './StatusBadge'
import { DAY_HEADER, LOG_TIME } from './time'
import { useStars } from './useStars'

const STATUSES = ['Go', 'TBC', 'TBD', 'Hold']

/** 'today' → "Today", an ISO date → "Sat 11 Oct", anything else (a NET text) as is. */
function dayLabel(key: string): string {
  if (key === 'today') return 'Today'
  if (key === 'tomorrow') return 'Tomorrow'
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? DAY_HEADER.format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : key
}

export function LaunchList({ launches, now }: { launches: Launch[]; now: number }) {
  // WHY: filters live in the URL (?provider=SpX&status=Go&starred=1): shareable, back-button friendly, no state library.
  const [params, setParams] = useSearchParams()
  const provider = params.get('provider')
  const status = params.get('status')
  const starredOnly = params.get('starred') === '1'
  const { stars, toggle } = useStars()
  const set = (key: string, value: string | null) =>
    setParams(
      (p) => {
        if (value === null || p.get(key) === value) p.delete(key)
        else p.set(key, value)
        return p
      },
      { replace: true },
    )
  const providers = [...new Set(launches.map((l) => l.providerAbbrev || l.provider))].sort()
  const shown = launches.filter(
    (l) => (!provider || (l.providerAbbrev || l.provider) === provider) && (!status || l.status.abbrev === status) && (!starredOnly || stars.has(l.id)),
  )
  const chip = (active: boolean, onClick: () => void, label: string) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border px-2 py-0.5 text-[10px] uppercase tracking-widest transition-colors ${active ? 'border-live bg-live text-background' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}
    >
      {label}
    </button>
  )
  return (
    <div id="launches">
      <Panel
        label={`Schedule · ${shown.length === launches.length ? `next ${launches.length}` : `${shown.length} of ${launches.length}`}`}
        actions={
          <a href={googleSubscribeUrl()} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
            subscribe in Google Calendar ↗
          </a>
        }
      >
        {/* WHY: one row of chips, not a form: a schedule board is scanned, and one click narrows it. */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2" aria-label="Filters">
          {chip(starredOnly, () => set('starred', '1'), `★ starred${stars.size ? ` · ${stars.size}` : ''}`)}
          <span aria-hidden="true" className="mx-1 h-3 w-px bg-border" />
          {STATUSES.filter((st) => launches.some((l) => l.status.abbrev === st)).map((st) => chip(status === st, () => set('status', st), st))}
          <span aria-hidden="true" className="mx-1 h-3 w-px bg-border" />
          {providers.map((p) => chip(provider === p, () => set('provider', p), p))}
        </div>
        {shown.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nothing matches. {starredOnly ? 'Star a launch with the ★ on its card.' : 'Clear a filter above.'}</p>
        ) : null}
        {/* WHY: the day is a tag on the card, not a header row: most days hold one launch, and a header per day left
            two empty cells per row. */}
        <ul className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map((launch) => (
            <li key={launch.id} className="relative bg-card">
              <LaunchCard launch={launch} now={now} day={dayLabel(dayKey(launch, now))} />
              {/* WHY: a button cannot live inside the card's <a>, so the star is a sibling placed over its corner. */}
              <button
                type="button"
                onClick={() => toggle(launch.id)}
                aria-pressed={stars.has(launch.id)}
                aria-label={stars.has(launch.id) ? 'Unstar this launch' : 'Star this launch'}
                className={`absolute right-2 bottom-2 px-1 text-base leading-none transition-colors ${stars.has(launch.id) ? 'text-live' : 'text-muted-foreground/50 hover:text-foreground'}`}
              >
                {stars.has(launch.id) ? '★' : '☆'}
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

// WHY: the whole card is one <a>. Middle-click, Cmd-click, keyboard focus and screen readers all work for free;
// a div with onClick would need all of that re-implemented (web-interface-guidelines: no div onClick).
function LaunchCard({ launch, now, day }: { launch: Launch; now: number; day: string }) {
  return (
    <Link
      to={`/launch/${launch.id}`}
      className="group flex h-full gap-4 p-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-live"
    >
      <Photo image={launch.image} thumb alt="" width={80} height={80} className="h-20 w-20 shrink-0 object-cover opacity-90 transition-opacity group-hover:opacity-100" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base whitespace-nowrap sm:text-lg">{countdownText(launch, now)}</p>
          <span className="flex shrink-0 items-center gap-2">
            {day.startsWith('NET') ? null : <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{day}</span>}
            <StatusBadge status={launch.status} />
          </span>
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
