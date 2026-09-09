import { gsap } from 'gsap'
import { useEffect, useMemo, useRef, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { countdownMode, formatOffset, GENERIC_TIMELINE, type Launch } from './launches'
import { LaunchStage } from './LaunchStage'
import { Panel } from './Panel'
import { buildTimeline, POSE0, type Pose } from './pose'
import { clockAt, eventTimes, ordinalAt, ordinalOfTime, timeOfOrdinal } from './sequence'
import { sceneLayout } from './vehicle'

// WHY: GSAP owns the motion (a scrubbable timeline with a beat per event, see pose.ts); React owns the markup and the
// readout; the stage draws whatever the pose says. The preference check lives here because GSAP timers don't know
// about prefers-reduced-motion.
const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function LaunchSequence({ launch, now }: { launch: Launch; now: number }) {
  const published = launch.timeline.length > 0
  const events = published ? launch.timeline : GENERIC_TIMELINE
  const n = events.length
  const times = useMemo(() => eventTimes(events), [events])
  const tSec = (now - Date.parse(launch.net)) / 1000
  const firm = countdownMode(launch, now) !== 'net-date' && launch.status.abbrev !== 'Hold'
  const liveOrdinal = firm ? ordinalAt(events, tSec) : null
  const isLive = liveOrdinal !== null
  const layout = useMemo(() => sceneLayout(launch.vehicle), [launch.vehicle])
  const hasBoosters = layout.boosters.length > 0
  const hasFairing = layout.segments[layout.segments.length - 1]!.kind === 'fairing'

  // One mutable pose for the life of the component: GSAP writes it, the stage reads it.
  const [pose] = useState<Pose>(() => ({ ...POSE0 }))
  const renderRef = useRef<((p: Pose) => void) | null>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const [playing, setPlaying] = useState(!REDUCED_MOTION)
  const [view, setView] = useState({ idx: 0, clock: events[0]!.offsetSec, ord: 0 })

  // Build the timeline once per launch. Frames are drawn from onUpdate, so a paused timeline costs nothing.
  useEffect(() => {
    Object.assign(pose, POSE0)
    const tl = buildTimeline(events, times, pose, { hasBoosters, hasFairing })
    // Readout: index, clock and marker position follow the timeline; state only changes when the shown values do.
    tl.eventCallback('onUpdate', () => {
      pose.t = tl.time()
      renderRef.current?.(pose)
      const ord = ordinalOfTime(times, tl.time())
      const idx = Math.min(n - 1, Math.floor(ord + 1e-6))
      const clock = Math.floor(clockAt(events, ord))
      const coarse = Math.round(ord * 50) / 50
      setView((v) => (v.idx === idx && v.clock === clock && v.ord === coarse ? v : { idx, clock, ord: coarse }))
    })
    renderRef.current?.(pose) // WHY: a paused rebuild (new launch while paused) must not leave the previous vehicle on screen
    tlRef.current = tl
    return () => {
      gsap.killTweensOf(tl) // a live or jump tweenTo still in flight would keep seeking a dead timeline
      tl.kill()
      tlRef.current = null
    }
  }, [events, times, n, hasBoosters, hasFairing, pose])

  // Drive: live follows the real clock (smoothly, one tween per second); preview plays or pauses.
  useEffect(() => {
    const tl = tlRef.current
    if (!tl) return
    if (isLive) {
      tl.pause()
      const target = timeOfOrdinal(times, liveOrdinal!)
      if (REDUCED_MOTION) tl.time(target)
      else tl.tweenTo(target, { duration: 1, ease: 'none' })
    } else if (playing && !REDUCED_MOTION) tl.play()
    else tl.pause()
  }, [isLive, liveOrdinal, playing, times])

  const jump = (i: number) => {
    const tl = tlRef.current
    if (!tl || isLive) return
    setPlaying(false)
    tl.pause()
    if (REDUCED_MOTION) tl.time(times[i]!)
    else tl.tweenTo(times[i]!, { duration: 0.6, ease: 'power2.inOut' })
  }

  const idx = isLive ? Math.min(n - 1, Math.floor(liveOrdinal! + 1e-6)) : view.idx
  const ord = isLive ? liveOrdinal! : view.ord
  const clock = isLive ? tSec : view.clock
  const current = events[idx]!

  return (
    <Panel
      label="Launch sequence"
      live={isLive}
      actions={
        <>
          <span>{published ? `published by ${launch.providerAbbrev || launch.provider}` : 'typical sequence · not published for this launch'}</span>
          {isLive ? null : (
            <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing} className={cn(buttonVariants({ variant: 'outline' }), 'h-6 px-2 text-[10px] uppercase tracking-widest')}>
              {playing ? '❚❚ pause' : '▶ play'}
            </button>
          )}
        </>
      }
    >
      {/* The stage: a full-bleed flight profile as the backdrop, the readout over its top-left corner, webcast style. */}
      <div className="relative h-[300px] overflow-hidden bg-background sm:h-[420px]">
        <LaunchStage vehicle={launch.vehicle} events={events} current={idx} pose={pose} renderRef={renderRef} label={`${launch.vehicle.name} at ${current.abbrev}: ${current.description}`} />
        {/* WHY: the clock sits over the diagram; a corner scrim keeps it legible without dimming the rest of the profile. */}
        <div aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-72 w-[46rem] max-w-full bg-[radial-gradient(ellipse_at_top_left,var(--card)_30%,transparent_72%)]" />
        <div className="absolute top-4 right-4 left-4 space-y-2 sm:right-auto">
          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            {isLive ? (
              <span className="flex items-center gap-2 text-live">
                <span aria-hidden="true" className="h-1.5 w-1.5 bg-live motion-safe:animate-pulse" />
                live · following the launch clock
              </span>
            ) : (
              <span>preview · compressed time · not to scale · click an event to jump</span>
            )}
          </div>
          <p className="whitespace-nowrap text-4xl sm:text-5xl">{formatOffset(clock)}</p>
          <p className="text-sm uppercase tracking-widest">{current.abbrev}</p>
          <p className="max-w-sm text-sm text-pretty text-muted-foreground">{current.description}</p>
          {!published ? (
            <p className="max-w-sm text-xs text-pretty text-muted-foreground">
              Typical two-stage sequence: {launch.providerAbbrev || launch.provider} has not published event times for this launch.
            </p>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto p-4 pt-3">
        <ol className="relative h-24" style={{ minWidth: `${n * 104}px` }} aria-label="Sequence events">
          <div aria-hidden="true" className="absolute top-3 right-12 left-12 h-px bg-border" />
          <div aria-hidden="true" className="absolute top-3 left-12 h-px bg-live" style={{ width: `calc((100% - 6rem) * ${ord / (n - 1)})` }} />
          <div aria-hidden="true" className="absolute top-3 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-live" style={{ left: `calc(3rem + (100% - 6rem) * ${ord / (n - 1)})` }} />
          {events.map((e, i) => {
            const state = i < idx ? 'past' : i === idx ? 'current' : 'future'
            return (
              <li key={`${e.abbrev}-${i}`} className="absolute top-0 w-24 -translate-x-1/2 text-center" style={{ left: `calc(3rem + (100% - 6rem) * ${i / (n - 1)})` }}>
                <button
                  type="button"
                  onClick={() => jump(i)}
                  aria-current={state === 'current' ? 'step' : undefined}
                  title={e.description}
                  className="w-full focus-visible:outline-2 focus-visible:outline-live disabled:cursor-default"
                  disabled={isLive}
                >
                  <span aria-hidden="true" className={`mx-auto mt-[9px] block h-1.5 w-1.5 border ${state === 'future' ? 'border-muted-foreground bg-background' : 'border-live bg-live'}`} />
                  <span className={`mt-3 block text-[10px] leading-tight uppercase tracking-widest ${state === 'future' ? 'text-muted-foreground' : 'text-foreground'}`}>{e.abbrev}</span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">{formatOffset(e.offsetSec)}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </Panel>
  )
}
