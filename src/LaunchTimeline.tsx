import { countdownMode, formatCountdown, formatOffset, GENERIC_TIMELINE, type Launch } from './launches'

/**
 * The launch sequence as a webcast-style bar: events on an ordinal axis (equal spacing, like SpaceX's timeline,
 * because 38 minutes of countdown would squash 8 minutes of flight to nothing on a linear axis), a progress
 * line and a marker interpolated between the two events around "now".
 */
export function LaunchTimeline({ launch, now }: { launch: Launch; now: number }) {
  const published = launch.timeline.length > 0
  const events = published ? launch.timeline : GENERIC_TIMELINE
  const n = events.length
  const mode = countdownMode(launch, now)
  const live = mode === 'tick' || mode === 'tplus'
  const tSec = live ? (now - Date.parse(launch.net)) / 1000 : null

  let progress = 0
  let nextIdx: number | null = null
  if (tSec !== null) {
    const first = events[0]!.offsetSec
    const last = events[n - 1]!.offsetSec
    if (tSec < first) nextIdx = 0
    else if (tSec >= last) progress = 1
    else {
      const i = events.findIndex((e, k) => tSec >= e.offsetSec && tSec < events[k + 1]!.offsetSec)
      const a = events[i]!.offsetSec
      const b = events[i + 1]!.offsetSec
      progress = (i + (tSec - a) / (b - a)) / (n - 1)
      nextIdx = i + 1
    }
  }

  return (
    <div className="space-y-3 p-4">
      <div className="overflow-x-auto pb-2">
        <ol className="relative h-28" style={{ minWidth: `${n * 104}px` }} aria-label="Launch sequence">
          <div aria-hidden="true" className="absolute top-3 right-12 left-12 h-px bg-border" />
          {live ? (
            <div aria-hidden="true" className="absolute top-3 left-12 h-px bg-live" style={{ width: `calc((100% - 6rem) * ${progress})` }} />
          ) : null}
          {live ? (
            <div
              aria-hidden="true"
              className="absolute top-3 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-live motion-safe:animate-pulse"
              style={{ left: `calc(3rem + (100% - 6rem) * ${progress})` }}
            />
          ) : null}
          {events.map((e, i) => {
            const state = tSec === null ? 'idle' : e.offsetSec <= tSec ? 'past' : i === nextIdx ? 'next' : 'future'
            return (
              <li
                key={`${e.abbrev}-${i}`}
                className="absolute top-0 w-24 -translate-x-1/2 text-center"
                style={{ left: `calc(3rem + (100% - 6rem) * ${i / (n - 1)})` }}
                title={e.description}
              >
                <span
                  aria-hidden="true"
                  className={`mx-auto mt-[9px] block h-1.5 w-1.5 border ${
                    state === 'past' ? 'border-live bg-live' : state === 'next' ? 'border-live bg-background' : 'border-muted-foreground bg-background'
                  }`}
                />
                <span className={`mt-3 block text-[10px] leading-tight uppercase tracking-widest ${state === 'future' || state === 'idle' ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {e.abbrev}
                </span>
                <span className="mt-1 block text-[10px] text-muted-foreground">{formatOffset(e.offsetSec)}</span>
              </li>
            )
          })}
        </ol>
      </div>
      <p className="text-xs text-muted-foreground">
        {tSec === null
          ? 'Shown relative to T-0. The marker appears once the launch time is firm.'
          : nextIdx === null
            ? 'Sequence complete.'
            : nextIdx === 0
              ? events[0]!.offsetSec === 0
                ? `Liftoff · ${formatCountdown(-tSec * 1000)}`
                : `Sequence begins at ${formatOffset(events[0]!.offsetSec)} · ${formatCountdown((events[0]!.offsetSec - tSec) * 1000)}`
              : `Next · ${events[nextIdx]!.abbrev} · ${formatOffset(events[nextIdx]!.offsetSec)} · in ${formatOffset(events[nextIdx]!.offsetSec - tSec).slice(2)}`}
      </p>
    </div>
  )
}
