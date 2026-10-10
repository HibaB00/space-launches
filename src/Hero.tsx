import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { countdownMode, countdownText, siteName, type Launch } from './launches'
import { Photo } from './Photo'
import { StatusBadge } from './StatusBadge'
import { LOCAL, UTC } from './time'

/** The nearest launch, always. Selection never moves this: a launch you pick opens its own page. */
export function Hero({ launch, now }: { launch: Launch; now: number }) {
  const mode = countdownMode(launch, now)
  const net = new Date(launch.net)
  const label = mode === 'tplus' ? 'Liftoff · awaiting update' : mode === 'hold' ? 'Countdown holding' : 'Next launch'
  const soon = mode === 'tick' && Date.parse(launch.net) - now < 3_600_000
  return (
    <section aria-labelledby="next-launch" className="relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden border border-border">
      <Photo image={launch.image} alt="" eager width={1600} height={1000} className="absolute inset-0 -z-20 h-full w-full object-cover" />
      {/* WHY: a scrim. Text over an unknown photo has no guaranteed contrast; a gradient from the page colour up to
          near-transparent gives the countdown a dark floor whatever the picture is. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/80 to-background/10" />
      <div className="space-y-3 p-6 sm:p-8">
        <p id="next-launch" className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          {soon ? <span aria-hidden="true" className="h-1.5 w-1.5 bg-live motion-safe:animate-pulse" /> : null}
          {label}
          <StatusBadge status={launch.status} />
          {launch.netPrecision === 'HR' && mode === 'tick' ? <span className="normal-case tracking-normal">±1{' '}h · T-0 known to the hour</span> : null}
        </p>
        <p className="whitespace-nowrap text-3xl sm:text-5xl xl:text-6xl">
          {countdownText(launch, now)}
          <span className="cursor" aria-hidden="true">
            ▌
          </span>
        </p>
        <h2 className="text-lg sm:text-xl" translate="no">
          {launch.rocket} <span className="text-muted-foreground">·</span> {launch.mission.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {launch.pad.name} · {siteName(launch)} · {launch.pad.country} · {launch.providerAbbrev || launch.provider}
        </p>
        {mode === 'net-date' ? null : (
          <p className="text-sm text-muted-foreground">
            <time dateTime={launch.net}>{LOCAL.format(net)}</time> · {UTC.format(net)} UTC
          </p>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          {launch.webcast ? (
            <a href={launch.webcast} target="_blank" rel="noreferrer" className={cn(buttonVariants(), 'bg-live text-background hover:bg-live/90')}>
              Watch live ↗
            </a>
          ) : null}
          <Link to={`/launch/${launch.id}`} className={buttonVariants({ variant: 'outline' })}>
            Mission details →
          </Link>
        </div>
      </div>
      {launch.image?.credit ? (
        <p className="absolute top-3 right-3 text-[10px] uppercase tracking-widest text-muted-foreground">photo · {launch.image.credit}</p>
      ) : null}
    </section>
  )
}
