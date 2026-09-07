import { Link } from 'react-router'
import { countdownText, siteName, type Launch } from './launches'
import { Photo } from './Photo'
import { StatusBadge } from './StatusBadge'

export function LaunchList({ launches, now }: { launches: Launch[]; now: number }) {
  return (
    <section id="launches" aria-labelledby="upcoming" className="space-y-4">
      <h2 id="upcoming" className="text-xs uppercase tracking-widest text-muted-foreground">
        Upcoming · {launches.length}
      </h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {launches.map((launch) => (
          <li key={launch.id}>
            <LaunchCard launch={launch} now={now} />
          </li>
        ))}
      </ul>
    </section>
  )
}

// WHY: the whole card is one <a>. Middle-click, Cmd-click, keyboard focus and screen readers all work for free;
// a div with onClick would need all of that re-implemented (web-interface-guidelines: no div onClick).
function LaunchCard({ launch, now }: { launch: Launch; now: number }) {
  return (
    <Link
      to={`/launch/${launch.id}`}
      className="group flex gap-4 border border-border bg-card p-3 transition-colors hover:border-foreground/60 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Photo
        image={launch.image}
        thumb
        alt=""
        width={80}
        height={80}
        className="h-20 w-20 shrink-0 object-cover opacity-80 grayscale transition-opacity group-hover:opacity-100"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base sm:text-lg">{countdownText(launch, now)}</p>
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
