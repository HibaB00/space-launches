import { lazy, Suspense, useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { GlobeBoundary, GlobeFallback } from './Home'
import { googleCalendarUrl, launchIcs } from './ics'
import { countdownMode, countdownText, formatNet, isFlown, padsOf, siteName, tabTitle, youtubeEmbedUrl } from './launches'
import { LaunchSequence } from './LaunchSequence'
import { LaunchList } from './LaunchList'
import { Panel } from './Panel'
import { Photo } from './Photo'
import { StatusBadge } from './StatusBadge'
import { LOCAL, LOG_TIME, padLocal, UTC, UTC_TIME } from './time'
import type { LaunchFeed } from './useLaunches'
import { VehiclePanel } from './VehiclePanel'

const Globe = lazy(() => import('./Globe').then((m) => ({ default: m.Globe })))

export function LaunchPage({ feed, past, now }: { feed: LaunchFeed | null; past: LaunchFeed | null; now: number }) {
  const { id } = useParams()
  // WHY: upcoming first, then the archive, so a launch's URL (and the calendar event pointing at it) outlives the launch.
  const launch = feed?.launches.find((l) => l.id === id) ?? past?.launches.find((l) => l.id === id) ?? null
  // Hooks run unconditionally; the early returns come after.
  const pads = useMemo(() => (launch ? padsOf([launch]) : []), [launch])
  // WHY: stamped with fetchedAt, not `now`, so the calendar URLs are stable and not rebuilt every second.
  const calendar = useMemo(
    () =>
      launch && feed
        ? { google: googleCalendarUrl(launch, feed.fetchedAt), ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(launchIcs(launch, feed.fetchedAt))}` }
        : null,
    [launch, feed],
  )

  if (!feed || (!launch && !past)) return <p className="text-muted-foreground">Loading launch…</p>
  if (!launch || !calendar) return <NotFound feed={feed} now={now} />

  const flown = isFlown(launch)
  const mode = countdownMode(launch, now)
  const net = new Date(launch.net)
  const timed = mode !== 'net-date'
  const embed = youtubeEmbedUrl(launch.webcast)
  const hasWindow = launch.windowStart && launch.windowEnd && launch.windowStart !== launch.windowEnd
  const year = net.getUTCFullYear()

  return (
    <article className="space-y-4">
      <title>{flown ? `${launch.status.abbrev} · ${launch.rocket} · ${launch.mission.name}` : tabTitle(launch, now)}</title>
      <Link to="/" className="inline-block text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← All launches
      </Link>

      <header className="relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden border border-border">
        <Photo image={launch.image} alt="" eager width={1600} height={900} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/80 to-background/10" />
        <div className="space-y-3 p-6 sm:p-8">
          <p className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            {launch.providerAbbrev || launch.provider} · {launch.mission.type}
            {launch.program.length > 0 ? ` · ${launch.program.join(', ')}` : ''}
            <StatusBadge status={launch.status} />
          </p>
          <h1 className="text-2xl text-pretty sm:text-3xl" translate="no">
            {launch.rocket} <span className="text-muted-foreground">·</span> {launch.mission.name}
          </h1>
          <p className="whitespace-nowrap text-3xl sm:text-5xl md:text-6xl">
            {countdownText(launch, now)}
            <span className="cursor" aria-hidden="true">
              ▌
            </span>
          </p>
          {timed ? (
            <p className="text-sm text-muted-foreground">
              {flown ? 'Lifted off ' : ''}
              <time dateTime={launch.net}>{LOCAL.format(net)}</time> · {UTC.format(net)} UTC · {padLocal(launch.pad.timezone).format(net)} at the pad
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{formatNet(launch)} · date not yet firm</p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            {launch.webcast ? (
              <a href={launch.webcast} target="_blank" rel="noreferrer" className={cn(buttonVariants(), 'bg-live text-background hover:bg-live/90')}>
                {flown ? 'Watch replay ↗' : 'Watch live ↗'}
              </a>
            ) : null}
            {/* WHY: "notify me" on a static site is a calendar event. Google's template link opens a prefilled event and
                Google applies the visitor's own reminders; the .ics is the same event for any other calendar, with a
                15-minute alarm baked in. No server, no push permission, works on every device. */}
            {flown ? null : (
              <>
                <a href={calendar.google} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}>
                  Add to Google Calendar ↗
                </a>
                <a href={calendar.ics} download={`${launch.mission.name.replace(/[^\w-]+/g, '-')}.ics`} className={buttonVariants({ variant: 'ghost' })} title="Download the event for Apple Calendar, Outlook or any other calendar (15-minute alarm included)">
                  Apple / Outlook (.ics)
                </a>
              </>
            )}
            {launch.flightClub ? (
              <a href={launch.flightClub} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}>
                Trajectory on Flight Club ↗
              </a>
            ) : null}
          </div>
        </div>
        {launch.image?.credit ? (
          <p className="absolute top-3 right-3 text-[10px] uppercase tracking-widest text-muted-foreground">photo · {launch.image.credit}</p>
        ) : null}
      </header>

      <LaunchSequence launch={launch} now={now} />

      {/* WHY: Mission and Launch site side by side at their natural heights (items-start: a stretched site panel either
          gapped between globe and facts or grew the globe to fill it), the log full width under them. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel label="Mission" bodyClassName="space-y-5 p-4">
          <p className="text-pretty break-words">{launch.mission.description || 'No mission description published yet.'}</p>
          {embed ? (
            <iframe
              src={embed}
              title={`Webcast: ${launch.mission.name}`}
              className="aspect-video w-full border border-border"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : null}
          <Separator />
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <Fact label="Type">{launch.mission.type}</Fact>
            <Fact label="Orbit">
              {launch.mission.orbit}
              {launch.mission.orbitAbbrev && launch.mission.orbitAbbrev !== 'N/A' ? ` (${launch.mission.orbitAbbrev})` : ''}
            </Fact>
            {launch.program.length > 0 ? <Fact label="Programme">{launch.program.join(', ')}</Fact> : null}
            <Fact label="Provider">{launch.provider}</Fact>
            <Fact label="Status">
              {launch.status.name}. <span className="text-muted-foreground">{launch.status.description}</span>
            </Fact>
            {launch.image ? (
              <Fact label="Photo">
                {launch.image.credit || 'unknown'}
                {launch.image.license ? ` · ${launch.image.license}` : ''}
              </Fact>
            ) : null}
          </dl>
          {launch.patch ? (
            <figure className="flex items-center gap-4 pt-2">
              <img src={launch.patch} alt={`${launch.mission.name} mission patch`} width={160} height={160} loading="lazy" className="h-28 w-28 object-contain" />
              <figcaption className="text-[10px] uppercase tracking-widest text-muted-foreground">mission patch</figcaption>
            </figure>
          ) : null}
        </Panel>
        <Panel label="Launch site" bodyClassName="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="relative aspect-[4/3] border border-border">
            <div className="absolute inset-0">
              <GlobeBoundary>
                <Suspense fallback={<GlobeFallback />}>
                  <Globe pads={pads} focusId={launch.id} className="h-full w-full" />
                </Suspense>
              </GlobeBoundary>
            </div>
          </div>
          <div className="space-y-4">
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
              <Fact label="Pad">{launch.pad.name}</Fact>
              <Fact label="Site">{siteName(launch)}</Fact>
              <Fact label="Country">{launch.pad.country}</Fact>
              {timed ? <Fact label="Local">{padLocal(launch.pad.timezone).format(net)}</Fact> : null}
              {timed && hasWindow ? (
                <Fact label="Window">
                  {UTC_TIME.format(new Date(launch.windowStart!))}–{UTC_TIME.format(new Date(launch.windowEnd!))} UTC
                </Fact>
              ) : null}
              <Fact label="Map">
                <a href={launch.pad.mapUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-live">
                  open ↗
                </a>
              </Fact>
            </dl>
            <div className="grid grid-cols-3 gap-px bg-border">
              <Tile value={launch.attempt.orbitalYear} label={`orbital launch of ${year}`} />
              <Tile value={launch.attempt.pad} label="launch from this pad" />
              <Tile value={launch.attempt.agencyYear} label={`by ${launch.providerAbbrev || 'provider'} in ${year}`} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel label="Mission log" actions={<span>{launch.updates.length} updates</span>}>
          {launch.updates.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No updates logged yet.</p>
          ) : (
            <ol className="divide-y divide-border text-xs">
              {launch.updates.map((u) => (
                <li key={`${u.at}-${u.by}`} className="grid grid-cols-[max-content_1fr] gap-x-3 px-3 py-2.5">
                  <time dateTime={u.at} className="whitespace-nowrap text-muted-foreground">
                    {LOG_TIME.format(new Date(u.at))}
                  </time>
                  <p className="text-pretty break-words">
                    {u.comment} <span className="text-muted-foreground">· {u.by}</span>
                    {u.url ? (
                      <>
                        {' '}
                        <a href={u.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-live">
                          source ↗
                        </a>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ol>
          )}
      </Panel>

      <VehiclePanel vehicle={launch.vehicle} flown={flown} />
    </article>
  )
}

function Tile({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="bg-card p-3">
      <p className="text-2xl">{value === null ? '—' : `#${value}`}</p>
      <p className="text-[10px] leading-tight uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </>
  )
}

// WHY: a dead link (an old calendar event, a typo) should land on the schedule, not on a dead end. The readout keeps
// the control-room voice; the list below is the same one as the home page.
export function NotFound({ feed, now }: { feed: LaunchFeed | null; now: number }) {
  return (
    <div className="space-y-4">
      <title>Not found · Space Launches</title>
      <Panel label="Signal lost" bodyClassName="space-y-3 p-6 sm:p-8">
        <p className="text-3xl sm:text-5xl">
          NO SUCH LAUNCH
          <span className="cursor" aria-hidden="true">
            ▌
          </span>
        </p>
        <p className="max-w-prose text-sm text-pretty text-muted-foreground">
          Nothing on the schedule or in the archive has this id. It may have been removed from the schedule, be older than the archive, or the link is wrong.
        </p>
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
          ← All launches
        </Link>
      </Panel>
      {feed ? <LaunchList launches={feed.launches} now={now} /> : null}
    </div>
  )
}
