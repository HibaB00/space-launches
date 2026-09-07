import { gsap } from 'gsap'
import { useEffect, useMemo, useRef, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { countdownMode, formatOffset, GENERIC_TIMELINE, type Launch } from './launches'
import { Panel } from './Panel'
import { classifyEvent, clockAt, eventTimes, ordinalAt, ordinalOfTime, timeOfOrdinal } from './sequence'
import { fairingHalvesD, noseD, sceneLayout } from './vehicle'

// WHY: GSAP owns the motion (a scrubbable timeline with a beat per event); React owns the markup and the readout.
// The preference check lives here because GSAP timers don't know about prefers-reduced-motion.
const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const FG = '#d4d4d4'
// Deterministic star field: golden-angle scatter, same every render.
const STARS = Array.from({ length: 54 }, (_, i) => ({ x: ((i * 137.508 * 7.3) % 300) + 10, y: ((i * 137.508 * 3.1) % 260) + 8, r: 0.5 + ((i * 37) % 10) / 14 }))

export function LaunchSequence({ launch, now }: { launch: Launch; now: number }) {
  const published = launch.timeline.length > 0
  const events = published ? launch.timeline : GENERIC_TIMELINE
  const n = events.length
  const times = useMemo(() => eventTimes(events), [events])
  const tSec = (now - Date.parse(launch.net)) / 1000
  const firm = countdownMode(launch, now) !== 'net-date' && launch.status.abbrev !== 'Hold'
  const liveOrdinal = firm ? ordinalAt(events, tSec) : null
  const isLive = liveOrdinal !== null
  const scene = useMemo(() => sceneLayout(launch.vehicle), [launch.vehicle])
  const { body, segments, boosters, style, ground } = scene
  const stage1 = segments[0]!
  const nose = segments[segments.length - 1]!
  const upper = segments.slice(1, -1)
  const hasBoosters = boosters.length > 0
  const hasFairing = nose.kind === 'fairing'

  const svgRef = useRef<SVGSVGElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const [playing, setPlaying] = useState(!REDUCED_MOTION)
  const [view, setView] = useState({ idx: 0, clock: events[0]!.offsetSec, ord: 0 })

  // Build the timeline once per launch: one beat per event, placed at its compressed time.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 3, defaults: { ease: 'power2.inOut' } })
      const total = times[n - 1]!
      const liftoffIdx = events.findIndex((e) => classifyEvent(e) === 'liftoff')
      const tLift = liftoffIdx >= 0 ? times[liftoffIdx]! : 0
      const flight = Math.max(2, total - tLift)
      let lit = false
      let boostersGone = !hasBoosters
      let fairingGone = !hasFairing
      let stage1Gone = false
      const light = (t: number) => {
        if (lit) return
        lit = true
        tl.fromTo('.flame1', { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.5, ease: 'power3.out', transformOrigin: '50% 0%' }, t)
        tl.fromTo('.glow', { opacity: 0 }, { opacity: 1, duration: 0.5 }, t)
        if (hasBoosters) tl.fromTo('.flame-b', { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.5, ease: 'power3.out', transformOrigin: '50% 0%' }, t)
        // WHY: a plume never holds still; a tiny yoyo on scaleY reads as burning without a keyframe animation.
        tl.to('.flame1, .flame-b', { scaleY: 1.12, duration: 0.09, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 0%' }, t + 0.5)
      }
      const dropBoosters = (t: number) => {
        if (boostersGone) return
        boostersGone = true
        tl.to('.flame-b', { opacity: 0, duration: 0.3 }, t)
        tl.to('.booster-l', { x: -70, y: 150, rotation: -28, opacity: 0, duration: 2.2, ease: 'power2.in', transformOrigin: '50% 50%' }, t)
        tl.to('.booster-r', { x: 70, y: 150, rotation: 28, opacity: 0, duration: 2.2, ease: 'power2.in', transformOrigin: '50% 50%' }, t)
      }
      const dropStage1 = (t: number) => {
        if (stage1Gone) return
        stage1Gone = true
        dropBoosters(t)
        tl.to('.flame1', { opacity: 0, duration: 0.2 }, t)
        tl.to('.stage1', { y: 190, rotation: 5, opacity: 0, duration: 2.4, ease: 'power1.in', transformOrigin: '50% 0%' }, t)
        tl.fromTo('.puff-sep', { scale: 0.3, opacity: 0.9 }, { scale: 3, opacity: 0, duration: 1.2, ease: 'power2.out', transformOrigin: '50% 50%' }, t)
      }
      const openFairing = (t: number) => {
        if (fairingGone) return
        fairingGone = true
        tl.to('.fairing-l', { rotation: -35, x: -46, y: 74, opacity: 0, duration: 2.2, ease: 'power2.in', transformOrigin: '100% 100%' }, t)
        tl.to('.fairing-r', { rotation: 35, x: 46, y: 74, opacity: 0, duration: 2.2, ease: 'power2.in', transformOrigin: '0% 100%' }, t)
        tl.to('.payload', { opacity: 1, duration: 0.8 }, t + 0.4)
      }
      events.forEach((e, i) => {
        const t = times[i]!
        switch (classifyEvent(e)) {
          case 'ignition':
            light(t)
            break
          case 'liftoff':
            light(t)
            tl.to('.pad', { y: 170, opacity: 0, duration: 2.6, ease: 'power2.in' }, t)
            tl.to('.strongback', { rotation: -16, duration: 1.6, ease: 'power2.out', transformOrigin: '50% 100%' }, t)
            tl.to('.rocket', { y: -16, duration: 2.6, ease: 'power1.out' }, t)
            tl.to('.stars', { opacity: 1, duration: Math.min(8, flight), ease: 'none' }, t)
            tl.to('.horizon', { y: -110, duration: flight, ease: 'power1.out' }, t)
            tl.to('.rocket', { scale: 0.82, duration: flight, ease: 'none', transformOrigin: '50% 100%' }, t + 2.6)
            tl.fromTo('.speedlines', { opacity: 0 }, { opacity: 0.45, duration: 2 }, t + 1)
            break
          case 'maxq':
            // WHY: a shiver at maximum dynamic pressure is the one physical thing this beat can show.
            tl.to('.rocket', { x: 1.5, duration: 0.05, yoyo: true, repeat: 11, ease: 'none' }, t)
            break
          case 'boosterSep':
            dropBoosters(t)
            break
          case 'meco':
            dropBoosters(t) // boosters are always gone by MECO
            tl.to('.flame1', { scaleY: 0.2, opacity: 0, duration: 0.35, ease: 'power2.in', transformOrigin: '50% 0%' }, t)
            tl.to('.glow', { opacity: 0, duration: 0.4 }, t)
            tl.to('.speedlines', { opacity: 0, duration: 1 }, t)
            break
          case 'stageSep':
            dropStage1(t)
            break
          case 'ses':
            dropStage1(t - 0.4) // staging always precedes second-engine start
            tl.fromTo('.flame2', { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.5, ease: 'power3.out', transformOrigin: '50% 0%' }, t)
            tl.to('.flame2', { scaleY: 1.1, duration: 0.09, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 0%' }, t + 0.5)
            break
          case 'seco':
            tl.to('.flame2', { scaleY: 0.2, opacity: 0, duration: 0.35, ease: 'power2.in', transformOrigin: '50% 0%' }, t)
            openFairing(t) // the fairing is always gone by orbit
            break
          case 'fairing':
            openFairing(t)
            break
          case 'deploy':
            openFairing(t - 1)
            tl.to('.payload', { y: -80, duration: 2.4, ease: 'power1.out' }, t)
            tl.to('.stage2', { opacity: 0.4, duration: 1.6 }, t + 0.6)
            tl.fromTo('.puff-deploy', { scale: 0.3, opacity: 0.8 }, { scale: 2.5, opacity: 0, duration: 1.2, ease: 'power2.out', transformOrigin: '50% 50%' }, t)
            break
          default:
            break
        }
      })
      // Readout: index, clock and marker position follow the timeline; state only changes when the shown values do.
      tl.eventCallback('onUpdate', () => {
        const ord = ordinalOfTime(times, tl.time())
        const idx = Math.min(n - 1, Math.floor(ord + 1e-6))
        const clock = Math.floor(clockAt(events, ord))
        const coarse = Math.round(ord * 50) / 50
        setView((v) => (v.idx === idx && v.clock === clock && v.ord === coarse ? v : { idx, clock, ord: coarse }))
      })
      tlRef.current = tl
    }, svg)
    return () => {
      ctx.revert()
      tlRef.current = null
    }
  }, [events, times, n, hasBoosters, hasFairing, scene])

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
  const [halfL, halfR] = fairingHalvesD(body.x, nose.y, body.w, nose.h)
  const cx = body.x + body.w / 2

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
      bodyClassName="space-y-4 p-4"
    >
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <svg ref={svgRef} viewBox="0 0 320 400" className="mx-auto h-[400px] w-full max-w-[320px]" role="img" aria-label={`${launch.vehicle.name} at ${current.abbrev}: ${current.description}`}>
          <defs>
            <linearGradient id="hull" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#111" />
              <stop offset="0.38" stopColor="#4b4b4b" />
              <stop offset="0.55" stopColor="#5c5c5c" />
              <stop offset="1" stopColor="#0d0d0d" />
            </linearGradient>
            <linearGradient id="hullLight" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#1c1c1c" />
              <stop offset="0.4" stopColor="#8b8b8b" />
              <stop offset="0.6" stopColor="#9a9a9a" />
              <stop offset="1" stopColor="#161616" />
            </linearGradient>
            <linearGradient id="plume" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.22" style={{ stopColor: 'var(--live)' }} />
              <stop offset="1" style={{ stopColor: 'var(--live)', stopOpacity: 0 }} />
            </linearGradient>
            <radialGradient id="glowGrad">
              <stop offset="0" style={{ stopColor: 'var(--live)', stopOpacity: 0.55 }} />
              <stop offset="1" style={{ stopColor: 'var(--live)', stopOpacity: 0 }} />
            </radialGradient>
            <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>

          <g className="stars" opacity={0}>
            {STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#cfd6db" />
            ))}
          </g>
          <g className="horizon">
            <circle cx={160} cy={ground + 662} r={620} fill="oklch(0.2 0.03 240)" opacity={0.55} />
            <circle cx={160} cy={ground + 662} r={620} fill="none" stroke="var(--live)" strokeOpacity={0.5} />
          </g>
          <g className="pad">
            <line x1={16} x2={304} y1={ground} y2={ground} stroke="#3a3a3a" />
            <rect x={cx - 26} y={ground} width={52} height={6} fill="#1e1e1e" stroke="#3a3a3a" />
          </g>
          <line className="strongback" x1={body.x - 14} x2={body.x - 14} y1={ground} y2={ground - body.h * 0.72} stroke="#6b6b6b" strokeWidth={2} />
          <g className="speedlines" opacity={0} stroke="#8a9096" strokeWidth={0.8}>
            {[-48, -36, 38, 50].map((dx) => (
              <line key={dx} x1={cx + dx} x2={cx + dx} y1={body.y + 30} y2={body.y + 90} />
            ))}
          </g>

          <g className="rocket">
            <g className="glow" opacity={0}>
              <ellipse cx={cx} cy={ground + 2} rx={44} ry={16} fill="url(#glowGrad)" />
            </g>
            {boosters.map((b, i) => {
              const side = b.x + b.w / 2 < cx ? 'booster-l' : 'booster-r'
              const bx = b.x + b.w / 2
              return (
                <g key={i} className={side}>
                  {b.kind === 'liquid' ? (
                    <path d={`M${b.x},${b.y + b.h} L${b.x + b.w * 0.28},${b.y} L${b.x + b.w * 0.72},${b.y} L${b.x + b.w},${b.y + b.h} Z`} fill="url(#hull)" stroke={FG} />
                  ) : (
                    <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="url(#hull)" stroke={FG} />
                  )}
                  <path d={noseD(b.x + (b.kind === 'liquid' ? b.w * 0.28 : 0), b.y - b.w * 0.7, b.kind === 'liquid' ? b.w * 0.44 : b.w, b.w * 0.7, 'nose')} fill="url(#hullLight)" stroke={FG} />
                  <g className="flame-b" opacity={0}>
                    <Plume x={bx} y={b.y + b.h} w={b.w * 1.1} h={b.h * 0.45} />
                  </g>
                </g>
              )
            })}
            <g className="stage1">
              <rect x={body.x} y={stage1.y} width={body.w} height={stage1.h} fill="url(#hull)" stroke={FG} />
              <rect x={body.x} y={stage1.y} width={body.w} height={Math.max(4, stage1.h * 0.07)} fill="#0a0a0a" stroke={FG} />
              {style === 'falcon' ? (
                <g stroke={FG} fill="#2a2a2a">
                  <path d={`M${body.x},${ground - body.h * 0.1} L${body.x - 5},${ground} L${body.x},${ground} Z`} />
                  <path d={`M${body.x + body.w},${ground - body.h * 0.1} L${body.x + body.w + 5},${ground} L${body.x + body.w},${ground} Z`} />
                  <rect x={body.x - 4} y={stage1.y + 3} width={4} height={6} />
                  <rect x={body.x + body.w} y={stage1.y + 3} width={4} height={6} />
                </g>
              ) : null}
              <g fill="#2a2a2a" stroke={FG}>
                {[0.22, 0.5, 0.78].map((f) => (
                  <path key={f} d={`M${body.x + body.w * f - 2.5},${ground - 6} l5,0 l2,6 l-9,0 z`} />
                ))}
              </g>
              <g className="flame1" opacity={0}>
                <Plume x={cx} y={ground} w={body.w * 1.5} h={body.h * 0.3} />
              </g>
            </g>
            <g className="stage2">
              {upper.map((s) => (
                <g key={s.label}>
                  <rect x={body.x} y={s.y} width={body.w} height={s.h} fill="url(#hull)" stroke={FG} />
                  <rect x={body.x} y={s.y} width={body.w} height={Math.max(3, s.h * 0.08)} fill="#0a0a0a" stroke={FG} />
                </g>
              ))}
              <g className="flame2" opacity={0}>
                <Plume x={cx} y={stage1.y} w={body.w * 0.9} h={body.h * 0.14} />
              </g>
            </g>
            {hasFairing ? (
              <>
                <g className="payload" opacity={0}>
                  <rect x={body.x + body.w * 0.24} y={nose.y + nose.h * 0.34} width={body.w * 0.52} height={nose.h * 0.46} fill="#3a3a3a" stroke={FG} />
                  <rect x={body.x - body.w * 0.5} y={nose.y + nose.h * 0.52} width={body.w * 0.72} height={nose.h * 0.1} fill="#1f2a33" stroke="var(--live)" strokeOpacity={0.8} />
                  <rect x={body.x + body.w * 0.78} y={nose.y + nose.h * 0.52} width={body.w * 0.72} height={nose.h * 0.1} fill="#1f2a33" stroke="var(--live)" strokeOpacity={0.8} />
                </g>
                <path className="fairing-l" d={halfL} fill="url(#hullLight)" stroke={FG} />
                <path className="fairing-r" d={halfR} fill="url(#hullLight)" stroke={FG} />
              </>
            ) : nose.kind === 'capsule' ? (
              <path className="payload" d={noseD(body.x, nose.y, body.w, nose.h, 'capsule')} fill="url(#hullLight)" stroke={FG} />
            ) : (
              <g fill="url(#hullLight)" stroke={FG}>
                <path d={noseD(body.x, nose.y, body.w, nose.h, nose.kind)} />
                {style === 'starship' ? (
                  <>
                    <rect x={body.x - 4} y={nose.y + nose.h * 0.72} width={4} height={nose.h * 0.2} />
                    <rect x={body.x + body.w} y={nose.y + nose.h * 0.72} width={4} height={nose.h * 0.2} />
                    <rect x={body.x - 3} y={nose.y + nose.h * 0.3} width={3} height={nose.h * 0.12} />
                    <rect x={body.x + body.w} y={nose.y + nose.h * 0.3} width={3} height={nose.h * 0.12} />
                  </>
                ) : null}
              </g>
            )}
            <circle className="puff-sep" cx={cx} cy={stage1.y} r={10} fill="#ffffff" opacity={0} />
            <circle className="puff-deploy" cx={cx} cy={nose.y + nose.h} r={8} fill="#ffffff" opacity={0} />
          </g>
        </svg>

        <div className="space-y-3">
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
          <p className="whitespace-nowrap text-5xl">{formatOffset(clock)}</p>
          <p className="text-sm uppercase tracking-widest">{current.abbrev}</p>
          <p className="max-w-prose text-sm text-pretty text-muted-foreground">{current.description}</p>
          {!published ? (
            <p className="max-w-prose text-xs text-pretty text-muted-foreground">
              Typical two-stage sequence: {launch.providerAbbrev || launch.provider} has not published event times for this launch.
            </p>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
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

/** Exhaust plume: a soft blurred cone in the live colour with a bright core. Scaled from its top by GSAP. */
function Plume({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const d = `M${x - w / 2},${y} Q${x},${y + h * 0.25} ${x},${y + h} Q${x},${y + h * 0.25} ${x + w / 2},${y} Z`
  const core = `M${x - w / 5},${y} Q${x},${y + h * 0.2} ${x},${y + h * 0.55} Q${x},${y + h * 0.2} ${x + w / 5},${y} Z`
  return (
    <g aria-hidden="true">
      <path d={d} fill="url(#plume)" filter="url(#soft)" opacity={0.9} />
      <path d={core} fill="#ffffff" opacity={0.9} />
    </g>
  )
}
