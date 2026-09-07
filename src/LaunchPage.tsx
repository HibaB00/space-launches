import { lazy, Suspense, useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { orbitProfile } from './geo'
import { GlobeFallback } from './Home'
import { launchIcs } from './ics'
import { countdownMode, countdownText, formatNet, padsOf, siteName, youtubeEmbedUrl } from './launches'
import { Photo } from './Photo'
import { StatusBadge } from './StatusBadge'
import { LOCAL, padLocal, UTC, UTC_TIME } from './time'
import type { LaunchFeed } from './useLaunches'

const Globe = lazy(() => import('./Globe').then((m) => ({ default: m.Globe })))

export function LaunchPage({ feed, now }: { feed: LaunchFeed | null; now: number }) {
  const { id } = useParams()
  const launch = feed?.launches.find((l) => l.id === id) ?? null
  // Hooks run unconditionally; the early returns come after.
  const pads = useMemo(() => (launch ? padsOf([launch]) : []), [launch])
  const trajectory = useMemo(
    () => (launch && launch.pad.lat !== null && launch.pad.lon !== null ? { lat: launch.pad.lat, lon: launch.pad.lon, orbitAbbrev: launch.mission.orbitAbbrev } : null),
    [launch],
  )
  // WHY: stamped with fetchedAt, not `now`, so the data: URL is stable and not rebuilt every second.
  const icsHref = useMemo(() => (launch && feed ? `data:text/calendar;charset=utf-8,${encodeURIComponent(launchIcs(launch, feed.fetchedAt))}` : ''), [launch, feed])

  if (!feed) return <p className="text-muted-foreground">Loading launch…</p>
  if (!launch) return <NotFound />

  const mode = countdownMode(launch, now)
  const net = new Date(launch.net)
  const timed = mode !== 'net-date'
  const embed = youtubeEmbedUrl(launch.webcast)
  const hasWindow = launch.windowStart && launch.windowEnd && launch.windowStart !== launch.windowEnd
  const inclination = launch.pad.lat !== null ? orbitProfile(launch.mission.orbitAbbrev, launch.pad.lat).inclinationDeg : null

  return (
    <article className="space-y-8">
      <title>{`${launch.rocket} · ${launch.mission.name} · Space Launches`}</title>
      <Link to="/" className="inline-block text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← All launches
      </Link>

      <header className="relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden border border-border">
        <Photo image={launch.image} alt="" eager width={1600} height={900} className="absolute inset-0 -z-20 h-full w-full object-cover opacity-60 grayscale" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/75 to-background/5" />
        <div className="space-y-3 p-6 sm:p-8">
          <p className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            {launch.providerAbbrev || launch.provider} · {launch.mission.type}
            <StatusBadge status={launch.status} />
          </p>
          <h1 className="text-2xl text-pretty sm:text-3xl" translate="no">
            {launch.rocket} <span className="text-muted-foreground">·</span> {launch.mission.name}
          </h1>
          <p className="text-4xl sm:text-6xl">
            {countdownText(launch, now)}
            <span className="cursor" aria-hidden="true">
              ▌
            </span>
          </p>
          {timed ? (
            <p className="text-sm text-muted-foreground">
              <time dateTime={launch.net}>{LOCAL.format(net)}</time> · {UTC.format(net)} UTC · {padLocal(launch.pad.timezone).format(net)} at the pad
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{formatNet(launch)} · date not yet firm</p>
          )}
        </div>
        {launch.image?.credit ? (
          <p className="absolute right-3 top-3 text-[10px] uppercase tracking-widest text-muted-foreground">photo · {launch.image.credit}</p>
        ) : null}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(320px,420px)]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {launch.webcast ? (
              <a href={launch.webcast} target="_blank" rel="noreferrer" className={buttonVariants()}>
                Watch live ↗
              </a>
            ) : null}
            {/* WHY: "notify me" on a static site is a calendar event with an alarm. It reaches every device the
                visitor owns, needs no server, no push permission, and survives the tab being closed. */}
            <a href={icsHref} download={`${launch.mission.name.replace(/[^\w-]+/g, '-')}.ics`} className={buttonVariants({ variant: 'outline' })}>
              Add to calendar
            </a>
            <a href={launch.pad.mapUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}>
              Pad on the map ↗
            </a>
          </div>
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
            <Fact label="Rocket">{launch.rocket}</Fact>
            <Fact label="Provider">{launch.provider}</Fact>
            <Fact label="Type">{launch.mission.type}</Fact>
            <Fact label="Orbit">
              {launch.mission.orbit}
              {launch.mission.orbitAbbrev && launch.mission.orbitAbbrev !== 'N/A' ? ` (${launch.mission.orbitAbbrev})` : ''}
            </Fact>
            <Fact label="Pad">
              {launch.pad.name}, {siteName(launch)}, {launch.pad.country}
            </Fact>
            {timed && hasWindow ? (
              <Fact label="Window">
                {UTC_TIME.format(new Date(launch.windowStart!))}–{UTC_TIME.format(new Date(launch.windowEnd!))} UTC
              </Fact>
            ) : null}
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
        </div>

        <aside className="space-y-3">
          <div className="aspect-square border border-border">
            <Suspense fallback={<GlobeFallback />}>
              <Globe pads={pads} focusId={launch.id} trajectory={trajectory} className="h-full w-full" />
            </Suspense>
          </div>
          <p className="text-xs text-pretty text-muted-foreground">
            {trajectory
              ? `Illustrative ascent from ${siteName(launch)} into ${launch.mission.orbit}${inclination !== null ? ` at about ${Math.round(inclination)}° inclination` : ''}. Drawn from the pad's latitude and the orbit type, not flight data. Drag to rotate.`
              : 'Pad coordinates not published for this launch.'}
          </p>
          {launch.patch ? (
            <figure className="space-y-2 pt-4">
              <img src={launch.patch} alt={`${launch.mission.name} mission patch`} width={200} height={200} loading="lazy" className="mx-auto h-44 w-44 object-contain" />
              <figcaption className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">mission patch</figcaption>
            </figure>
          ) : null}
        </aside>
      </div>
    </article>
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

export function NotFound() {
  return (
    <div className="space-y-3">
      <title>Not found · Space Launches</title>
      <p className="text-2xl">No such launch.</p>
      <p className="text-muted-foreground">It may have flown, been removed from the schedule, or the link is wrong.</p>
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>
        ← All launches
      </Link>
    </div>
  )
}
