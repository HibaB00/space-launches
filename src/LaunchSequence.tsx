import { useEffect, useRef, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { countdownMode, formatOffset, GENERIC_TIMELINE, type Launch } from './launches'
import { Panel } from './Panel'
import { clockAt, flightState, ordinalAt, segmentDuration } from './sequence'
import { fairingHalvesD, inferBoosters, noseD, schematicLayout } from './vehicle'

// WHY: CSS can't pause the timers or the WebGL-free SVG transitions we drive from state; read the preference here.
const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const EASE = REDUCED_MOTION ? 'none' : 'transform 1.8s ease-in, opacity 1.8s ease-in'
const FG = 'var(--foreground)'
const FILL = 'var(--card)'
const part = (gone: boolean, transform: string) => ({
  transform: gone ? transform : 'none',
  opacity: gone ? 0 : 1,
  transition: EASE,
  transformBox: 'fill-box' as const,
  transformOrigin: 'center' as const,
})
// A stand-in silhouette when LL2 has no dimensions for the vehicle.
const GENERIC_DIMS = { lengthM: 50, diameterM: 3.7, stages: 2 }

/**
 * The launch as an animation: the vehicle plays through its own event sequence. Boosters peel away, the fairing
 * opens, the first stage drops, the upper stage burns, the payload deploys. Preview mode compresses time and loops;
 * once the real countdown enters the sequence window it follows the launch clock instead.
 */
export function LaunchSequence({ launch, now }: { launch: Launch; now: number }) {
  const published = launch.timeline.length > 0
  const events = published ? launch.timeline : GENERIC_TIMELINE
  const n = events.length
  const tSec = (now - Date.parse(launch.net)) / 1000
  const firm = countdownMode(launch, now) !== 'net-date' && launch.status.abbrev !== 'Hold'
  const liveOrdinal = firm ? ordinalAt(events, tSec) : null
  const isLive = liveOrdinal !== null

  const [playing, setPlaying] = useState(!REDUCED_MOTION)
  const [pos, setPos] = useState(0)
  // WHY (rerender-use-ref-transient-values): the interval reads and writes the position through a ref so the
  // closure never goes stale; state is only set to trigger the render.
  const posRef = useRef(0)
  useEffect(() => {
    if (isLive || !playing) return
    let last = performance.now()
    let hold = 0
    const id = setInterval(() => {
      const t = performance.now()
      const dt = Math.min(0.1, (t - last) / 1000)
      last = t
      if (hold > 0) {
        hold -= dt
        if (hold <= 0) {
          posRef.current = 0
          setPos(0)
        }
        return
      }
      const i = Math.min(n - 2, Math.floor(posRef.current))
      const next = posRef.current + dt / segmentDuration(events, i)
      if (next >= n - 1) {
        posRef.current = n - 1
        hold = 3
      } else posRef.current = next
      setPos(posRef.current)
    }, 40)
    return () => clearInterval(id)
  }, [isLive, playing, events, n])

  const jump = (i: number) => {
    posRef.current = i
    setPos(i)
    setPlaying(false)
  }

  const ordinal = isLive ? liveOrdinal : pos
  const idx = Math.min(n - 1, Math.floor(ordinal + 1e-6))
  const current = events[idx]!
  const clock = isLive ? tSec : clockAt(events, ordinal)
  const v = launch.vehicle
  const inferred = inferBoosters(v)
  const st = flightState(events, idx, inferred.count > 0)
  const layout = schematicLayout(v.lengthM && v.diameterM ? v : { ...v, ...GENERIC_DIMS }, 320, 380)!
  const { body, ground, segments, boosters, style } = layout
  const dx = 160 - (body.x + body.w / 2)
  const stage1 = segments[0]!
  const nose = segments[segments.length - 1]!
  const upper = segments.slice(1, -1)
  const upperBottom = stage1.y
  const [halfL, halfR] = fairingHalvesD(body.x, nose.y, body.w, nose.h)

  return (
    <Panel
      label="Launch sequence"
      live={isLive}
      actions={
        <>
          <span>{published ? `published by ${launch.providerAbbrev || launch.provider}` : 'typical sequence · not published for this launch'}</span>
          {isLive ? null : (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-pressed={playing}
              className={cn(buttonVariants({ variant: 'outline' }), 'h-6 px-2 text-[10px] uppercase tracking-widest')}
            >
              {playing ? '❚❚ pause' : '▶ play'}
            </button>
          )}
        </>
      }
      bodyClassName="space-y-4 p-4"
    >
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <svg
          viewBox="0 0 320 380"
          className="mx-auto h-[380px] w-full max-w-[320px]"
          role="img"
          aria-label={`${v.name} at ${current.abbrev}: ${current.description}`}
        >
          {/* pad: ground line and strongback, retracting at liftoff */}
          <g style={{ opacity: st.lifted ? 0 : 1, transition: 'opacity 2.5s ease-in' }}>
            <line x1={24} x2={296} y1={ground} y2={ground} stroke="var(--border)" />
            <line
              x1={body.x + dx - 12}
              x2={body.x + dx - 12}
              y1={ground}
              y2={ground - body.h * 0.7}
              stroke="var(--muted-foreground)"
              style={{ transform: st.lifted ? 'rotate(-12deg)' : 'none', transformOrigin: `${body.x + dx - 12}px ${ground}px`, transition: 'transform 2.5s ease-out' }}
            />
          </g>
          <g transform={`translate(${dx},0)`}>
            <g style={{ transform: st.lifted ? 'translateY(-20px)' : 'none', transition: 'transform 3s ease-out' }}>
              {boosters.map((b, i) => {
                const side = b.x + b.w / 2 < body.x + body.w / 2 ? -1 : 1
                return (
                  <g key={i} fill={FILL} stroke={FG} style={part(st.boostersOff, `translate(${side * 44}px, 90px) rotate(${side * -18}deg)`)}>
                    {b.kind === 'liquid' ? (
                      <path d={`M${b.x},${b.y + b.h} L${b.x + b.w * 0.28},${b.y} L${b.x + b.w * 0.72},${b.y} L${b.x + b.w},${b.y + b.h} Z`} />
                    ) : (
                      <rect x={b.x} y={b.y} width={b.w} height={b.h} />
                    )}
                    <path d={noseD(b.x + (b.kind === 'liquid' ? b.w * 0.28 : 0), b.y - b.w * 0.6, b.kind === 'liquid' ? b.w * 0.44 : b.w, b.w * 0.6, 'nose')} />
                    {st.mainEngine && !st.boostersOff ? <Flame x={b.x + b.w / 2} y={b.y + b.h} w={b.w * 1.1} h={b.h * 0.35} /> : null}
                  </g>
                )
              })}
              {/* first stage with its engines, legs and fins */}
              <g style={part(st.stage1Off, 'translateY(130px)')}>
                <rect x={body.x} y={stage1.y} width={body.w} height={stage1.h} fill={FILL} stroke={FG} />
                <g fill={FILL} stroke={FG}>
                  {[0.25, 0.5, 0.75].map((f) => (
                    <path key={f} d={`M${body.x + body.w * f - 1.5},${ground - 5} l3,0 l1.5,5 l-6,0 z`} />
                  ))}
                </g>
                {style === 'falcon' ? (
                  <g stroke={FG} fill={FILL}>
                    <path d={`M${body.x},${ground - body.h * 0.12} L${body.x - 4},${ground} L${body.x},${ground} Z`} />
                    <path d={`M${body.x + body.w},${ground - body.h * 0.12} L${body.x + body.w + 4},${ground} L${body.x + body.w},${ground} Z`} />
                    <rect x={body.x - 3} y={stage1.y + 2} width={3} height={4} />
                    <rect x={body.x + body.w} y={stage1.y + 2} width={3} height={4} />
                  </g>
                ) : null}
                {st.mainEngine ? <Flame x={body.x + body.w / 2} y={ground} w={body.w * 1.4} h={body.h * 0.28} /> : null}
              </g>
              {/* upper stage(s): keep flying, dim once the payload is away */}
              <g style={{ opacity: st.deployed ? 0.45 : 1, transition: EASE }}>
                {upper.map((s) => (
                  <rect key={s.label} x={body.x} y={s.y} width={body.w} height={s.h} fill={FILL} stroke={FG} />
                ))}
                {st.secondEngine && st.stage1Off ? <Flame x={body.x + body.w / 2} y={upperBottom} w={body.w * 0.9} h={body.h * 0.12} /> : null}
              </g>
              {/* nose: fairing halves + payload, or capsule, or ship */}
              {nose.kind === 'fairing' ? (
                <>
                  <g style={{ opacity: st.fairingOff ? 1 : 0, transform: st.deployed ? 'translateY(-60px)' : 'none', transition: EASE, transformBox: 'fill-box', transformOrigin: 'center' }}>
                    <rect x={body.x + body.w * 0.22} y={nose.y + nose.h * 0.32} width={body.w * 0.56} height={nose.h * 0.5} fill={FILL} stroke={FG} />
                    <line x1={body.x - body.w * 0.4} x2={body.x + body.w * 0.22} y1={nose.y + nose.h * 0.57} y2={nose.y + nose.h * 0.57} stroke={FG} />
                    <line x1={body.x + body.w * 0.78} x2={body.x + body.w * 1.4} y1={nose.y + nose.h * 0.57} y2={nose.y + nose.h * 0.57} stroke={FG} />
                  </g>
                  <path d={halfL} fill={FILL} stroke={FG} style={part(st.fairingOff, 'translate(-52px, 56px) rotate(-30deg)')} />
                  <path d={halfR} fill={FILL} stroke={FG} style={part(st.fairingOff, 'translate(52px, 56px) rotate(30deg)')} />
                </>
              ) : nose.kind === 'capsule' ? (
                <path d={noseD(body.x, nose.y, body.w, nose.h, 'capsule')} fill={FILL} stroke={FG} style={{ transform: st.deployed ? 'translateY(-60px)' : 'none', transition: EASE, transformBox: 'fill-box', transformOrigin: 'center' }} />
              ) : (
                <g fill={FILL} stroke={FG}>
                  <path d={noseD(body.x, nose.y, body.w, nose.h, nose.kind)} />
                  {style === 'starship' ? (
                    <>
                      <rect x={body.x - 3} y={nose.y + nose.h * 0.72} width={3} height={nose.h * 0.2} />
                      <rect x={body.x + body.w} y={nose.y + nose.h * 0.72} width={3} height={nose.h * 0.2} />
                      <rect x={body.x - 2} y={nose.y + nose.h * 0.3} width={2} height={nose.h * 0.12} />
                      <rect x={body.x + body.w} y={nose.y + nose.h * 0.3} width={2} height={nose.h * 0.12} />
                    </>
                  ) : null}
                </g>
              )}
            </g>
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
              <span>preview · compressed time · click an event to jump</span>
            )}
          </div>
          <p className="whitespace-nowrap text-5xl">{formatOffset(clock)}</p>
          <p className="text-sm uppercase tracking-widest">{current.abbrev}</p>
          <p className="max-w-prose text-sm text-pretty text-muted-foreground">{current.description}</p>
          {!published ? (
            <p className="max-w-prose text-xs text-pretty text-muted-foreground">
              Typical two-stage sequence. {launch.providerAbbrev || launch.provider} has not published event times for this launch; the vehicle silhouette
              {v.lengthM ? ' uses its published dimensions.' : ' is a generic stand-in.'}
            </p>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <ol className="relative h-24" style={{ minWidth: `${n * 104}px` }} aria-label="Sequence events">
          <div aria-hidden="true" className="absolute top-3 right-12 left-12 h-px bg-border" />
          <div aria-hidden="true" className="absolute top-3 left-12 h-px bg-live" style={{ width: `calc((100% - 6rem) * ${ordinal / (n - 1)})`, transition: isLive ? 'none' : 'width 40ms linear' }} />
          <div
            aria-hidden="true"
            className="absolute top-3 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-live"
            style={{ left: `calc(3rem + (100% - 6rem) * ${ordinal / (n - 1)})`, transition: isLive ? 'none' : 'left 40ms linear' }}
          />
          {events.map((e, i) => {
            const state = i < idx ? 'past' : i === idx ? 'current' : 'future'
            return (
              <li key={`${e.abbrev}-${i}`} className="absolute top-0 w-24 -translate-x-1/2 text-center" style={{ left: `calc(3rem + (100% - 6rem) * ${i / (n - 1)})` }}>
                <button
                  type="button"
                  onClick={() => (isLive ? undefined : jump(i))}
                  aria-current={state === 'current' ? 'step' : undefined}
                  title={e.description}
                  className="w-full focus-visible:outline-2 focus-visible:outline-live disabled:cursor-default"
                  disabled={isLive}
                >
                  <span
                    aria-hidden="true"
                    className={`mx-auto mt-[9px] block h-1.5 w-1.5 border ${state === 'future' ? 'border-muted-foreground bg-background' : 'border-live bg-live'}`}
                  />
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

function Flame({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g className="flame" aria-hidden="true">
      <path d={`M${x - w / 2},${y} L${x},${y + h} L${x + w / 2},${y} Z`} fill="var(--live)" opacity={0.85} />
      <path d={`M${x - w / 4},${y} L${x},${y + h * 0.6} L${x + w / 4},${y} Z`} fill="var(--foreground)" opacity={0.9} />
    </g>
  )
}
