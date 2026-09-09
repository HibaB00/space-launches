// The launch stage: a flight-profile diagram in the house line-art style (the genre SpaceX's launch pages use). The
// ascent arc runs from the pad at the left to the top right; every flight event is a marker on it with a small
// silhouette of the vehicle as it is at that moment; first-stage return events sit on a dashed return leg. The hero
// vehicle moves along the arc as a pure function of the Pose (see pose.ts): render(pose) draws one frame and keeps no
// time of its own, so scrubbing backwards replays identical frames. React renders the markup; render() writes attributes.
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { formatOffset, type TimelineEvent, type Vehicle } from './launches'
import type { Pose } from './pose'
import { arc, configAt, isReturnEvent, placeLabels, quadratic, type Anchor, type Config } from './profile'
import { classifyEvent } from './sequence'
import { fairingHalvesD, noseD, sceneLayout, type Scene } from './vehicle'

const H = 420 // frame height in viewBox units; the width follows the container so the diagram always fills it
const GROUND = 372
const FG = 'var(--foreground)'
const INK = 'var(--muted-foreground)'
const FILL = 'var(--card)'
const HERO = 0.3 // the moving vehicle, in sceneLayout units → frame
const ICON = 0.17 // the milestone silhouettes
const PARTICLES = 16

/** Deterministic PRNG so every mount draws the same stars and plume. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(11)
const STARS = Array.from({ length: 90 }, () => ({ u: rnd(), v: rnd() * 0.85, r: 0.4 + rnd() * 0.9, o: 0.25 + rnd() * 0.6 }))
const SEEDS = Array.from({ length: 3 }, () => Array.from({ length: PARTICLES }, () => [rnd(), rnd(), rnd(), rnd()] as const))

export function LaunchStage({ vehicle, events, current, pose, renderRef, label }: {
  vehicle: Vehicle
  events: TimelineEvent[]
  /** index of the event being shown; markers before it are past */
  current: number
  pose: Pose
  /** the parent's hook into the stage: set on mount, nulled on unmount, called from the timeline's onUpdate */
  renderRef: RefObject<((p: Pose) => void) | null>
  label: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [W, setW] = useState(1200)
  // Base centre at the origin, up is −y; groups are moved along the arc.
  const scene = useMemo(() => sceneLayout(vehicle, 0, 0), [vehicle])
  const { body, segments, boosters, style } = scene
  const stage1 = segments[0]!
  const nose = segments[segments.length - 1]!
  const upper = segments.slice(1, -1)
  const h = body.h
  const w = body.w
  const flags = useMemo(() => ({ hasBoosters: boosters.length > 0, hasFairing: nose.kind === 'fairing' }), [boosters.length, nose.kind])
  const [halfL, halfR] = fairingHalvesD(body.x, nose.y, w, nose.h)

  // The profile: an ascent arc, a return leg when the timeline has first-stage return events, a marker per flight event,
  // and a label position for each that avoids the readout, the silhouettes and the other labels.
  const profile = useMemo(() => {
    const liftoff = Math.max(0, events.findIndex((e) => classifyEvent(e) === 'liftoff'))
    const nFlight = events.length - liftoff
    const u = (i: number) => (nFlight > 1 ? (i - liftoff) / (nFlight - 1) : 0)
    // WHY: the shape of a gravity turn, not a trajectory: vertical off the pad, bending over to nearly level at the top
    // right. Shallow on the left so the readout overlay (top-left) stays clear.
    const ascent = arc({ x: 0.07 * W, y: GROUND }, { x: 0.07 * W, y: 290 }, { x: 0.4 * W, y: 100 }, { x: 0.94 * W, y: 62 })
    const returns = events.map((_, i) => i).filter((i) => i >= liftoff && isReturnEvent(events[i]!))
    const sepIdx = events.findIndex((e) => classifyEvent(e) === 'stageSep' || classifyEvent(e) === 'ses')
    let ret = null
    if (returns.length > 0) {
      const S = ascent.at(u(sepIdx >= 0 ? sepIdx : liftoff + Math.round((nFlight - 1) * 0.4)))
      // WHY: drawn descending under the ascent rather than as the real ballistic loop above it: the frame is small and the loop would cross the labels.
      ret = quadratic(S, { x: S.x + 0.12 * W, y: S.y + 0.5 * (GROUND - S.y) }, { x: S.x + 0.2 * W, y: GROUND })
    }
    const markers = events.slice(liftoff).map((e, j) => {
      const i = liftoff + j
      const cfg = configAt(events, i, flags)
      const pos = cfg.return && ret ? ret.at(0.35 + (0.65 * (returns.indexOf(i) + 1)) / returns.length) : ascent.at(u(i))
      const time = formatOffset(e.offsetSec)
      const prefer: Anchor[] | undefined = i === liftoff ? ['right'] : cfg.return ? ['right', 'left', 'below'] : undefined
      return { i, e, cfg, pos, w: Math.max(e.abbrev.length, time.length) * 7 + 4, h: 24, prefer }
    })
    const pad = ascent.at(0)
    const reserved = [
      { x: 0, y: 0, w: Math.min(W, 420), h: 230 }, // the readout overlay
      { x: pad.x - 30, y: GROUND - 95, w: 60, h: 100 }, // the pad and the vehicle standing on it
      ...markers.map((m) => ({ x: m.pos.x - 26, y: m.pos.y - 26, w: 52, h: 52 })), // silhouettes
    ]
    const labels = placeLabels(markers.map((m) => ({ x: m.pos.x, y: m.pos.y, w: m.w, h: m.h, prefer: m.prefer })), { w: W, h: H }, reserved)
    return { ascent, ret, markers: markers.map((m, k) => ({ ...m, label: labels[k]! })), liftoff }
  }, [events, W, flags])

  // The viewBox width follows the container's aspect so the diagram fills it edge to edge at every size.
  useEffect(() => {
    const host = svgRef.current?.parentElement
    if (!host) return
    const measure = () => setW(Math.max(320, Math.round(((host.clientWidth || 1) / (host.clientHeight || 1)) * H)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const q = <T extends Element = SVGGElement>(sel: string) => svg.querySelector(sel) as T
    const all = <T extends Element = SVGGElement>(sel: string) => Array.from(svg.querySelectorAll(sel)) as T[]
    const rocket = q('.rocket')
    const stars = q('.stars')
    const trail = q<SVGPathElement>('.trail')
    const strongback = q<SVGLineElement>('.strongback')
    const padGlow = q<SVGEllipseElement>('.pad-glow')
    const stage1El = q('.stage1')
    const stage2El = q('.stage2')
    const boosterL = all('.booster-l')
    const boosterR = all('.booster-r')
    const fairL = q<SVGPathElement>('.fairing-l')
    const fairR = q<SVGPathElement>('.fairing-r')
    const payload = q('.payload')
    const panels = all('.panel')
    const flames = [q('.flame1'), q('.flame2'), ...all('.flame-b')]
    const flameDims = [{ w: w * 1.3, len: h * 0.7 }, { w: w * 0.8, len: h * 0.3 }, ...boosters.map((b) => ({ w: b.w * 1.1, len: b.h * 0.5 }))]
    const particles = flames.map((f) => Array.from(f.querySelectorAll('.pt')) as SVGCircleElement[])
    const { ascent } = profile
    const noseH = nose.h
    const stage1H = stage1.h
    const set = (el: Element, name: string, v: number | string) => el.setAttribute(name, typeof v === 'number' ? v.toFixed(3) : v)

    const render = (pose: Pose) => {
      const { p, alt, deploy: d, t } = pose
      const pt = ascent.at(p)
      const shake = pose.shake * 2 * Math.sin(t * 91) // WHY: the Max-Q shiver is the one physical thing that beat can show
      set(rocket, 'transform', `translate(${(pt.x + shake).toFixed(2)} ${pt.y.toFixed(2)}) rotate(${pt.angle.toFixed(2)})`)
      set(trail, 'stroke-dashoffset', ascent.length * (1 - p))
      set(stars, 'opacity', 0.25 + 0.55 * alt)
      set(strongback, 'transform', `rotate(${(-16 * pose.lift).toFixed(2)} ${strongback.x1.baseVal.value} 0)`)
      set(padGlow, 'opacity', 0.9 * pose.throttle1 * (1 - pose.lift))
      // Separations, each in the vehicle's own frame.
      const sp = pose.stageSep
      set(stage1El, 'transform', `translate(${(-30 * sp).toFixed(2)} ${(220 * sp).toFixed(2)}) rotate(${(6 * sp).toFixed(2)} 0 ${-stage1H})`)
      set(stage1El, 'opacity', 1 - sp)
      const bs = pose.boosterSep
      for (const [els, side] of [[boosterL, -1], [boosterR, 1]] as const) {
        for (const el of els) {
          set(el, 'transform', `translate(${(side * 80 * bs).toFixed(2)} ${(160 * bs).toFixed(2)}) rotate(${(side * 26 * bs).toFixed(2)})`)
          set(el, 'opacity', 1 - bs)
        }
      }
      const f = pose.fairing
      const hinge = Math.min(1, f / 0.4)
      const fall = Math.max(0, (f - 0.2) / 0.8)
      set(fairL, 'transform', `translate(${(-48 * fall).toFixed(2)} ${(80 * fall).toFixed(2)}) rotate(${(-35 * hinge).toFixed(2)} 0 ${nose.y + noseH})`)
      set(fairR, 'transform', `translate(${(48 * fall).toFixed(2)} ${(80 * fall).toFixed(2)}) rotate(${(35 * hinge).toFixed(2)} 0 ${nose.y + noseH})`)
      set(fairL, 'opacity', 1 - fall)
      set(fairR, 'opacity', 1 - fall)
      set(payload, 'opacity', Math.min(1, Math.max(0, (f - 0.15) * 4)))
      set(stage2El, 'transform', `translate(0 ${(120 * d).toFixed(2)})`)
      set(stage2El, 'opacity', 1 - 0.6 * d)
      for (const pn of panels) set(pn, 'transform', `scale(${(0.05 + 0.95 * d).toFixed(3)} 1)`)
      // Plumes: cones scale with throttle and flicker; particles are a function of (seed, t).
      const throttles = [pose.throttle1, pose.throttle2, ...boosters.map(() => pose.throttleB)]
      const flick = 1 + 0.06 * Math.sin(37 * t) * Math.sin(23 * t)
      const spread = 1 + 2 * p // WHY: a plume balloons in thin air
      flames.forEach((fl, i) => {
        const th = throttles[i]!
        set(fl, 'transform', `scale(${(0.7 + 0.3 * th).toFixed(3)} ${(th * flick).toFixed(3)})`)
        set(fl, 'opacity', th)
        if (th <= 0.001) return
        const seeds = SEEDS[Math.min(2, i)]!
        const { w: pw, len } = flameDims[i]!
        particles[i]!.forEach((c, j) => {
          const [s0, s1, s2, s3] = seeds[j]!
          const life = (s0 + t * (1.2 + 0.8 * s3)) % 1
          set(c, 'cx', (s1 * 2 - 1) * pw * 0.45 * (0.3 + 1.7 * life * life) * spread + 0.04 * pw * Math.sin(23 * t + 40 * s0))
          set(c, 'cy', life * len * (0.3 + 0.7 * th))
          set(c, 'r', pw * 0.11 * (0.35 + 0.9 * life) * (0.5 + s2))
          set(c, 'opacity', (1 - life) * (1 - life) * 0.9)
        })
      })
    }
    renderRef.current = render
    render(pose)
    return () => {
      renderRef.current = null
    }
  }, [profile, pose, renderRef, boosters, h, nose, stage1, w])

  const { ascent, ret, markers } = profile
  const pad = ascent.at(0)
  const showLabels = W >= 720 // ponytail: on a phone only the current event is labelled; the scrubber below names the rest
  const bandH = (sh: number) => Math.max(3, sh * 0.07)

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} className="block h-full w-full [&_.ink_*]:[vector-effect:non-scaling-stroke]">
      <defs>
        <linearGradient id="plume" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.2" style={{ stopColor: 'var(--live)' }} />
          <stop offset="1" style={{ stopColor: 'var(--live)', stopOpacity: 0 }} />
        </linearGradient>
        <radialGradient id="glowGrad">
          <stop offset="0" style={{ stopColor: 'var(--live)', stopOpacity: 0.6 }} />
          <stop offset="1" style={{ stopColor: 'var(--live)', stopOpacity: 0 }} />
        </radialGradient>
        <filter id="soft" x="-50%" y="-20%" width="200%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="softer" x="-60%" y="-20%" width="220%" height="170%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <g className="stars" opacity={0.25}>
        {STARS.map((s, i) => (
          <circle key={i} cx={s.u * W} cy={s.v * H} r={s.r} fill="#cfd6db" opacity={s.o} />
        ))}
      </g>
      {/* Horizon: a hairline with the faintest curve; the pads sit on it. */}
      <path d={`M0,${GROUND + 8} Q${W / 2},${GROUND - 12} ${W},${GROUND + 8}`} fill="none" stroke="var(--border)" />

      {/* Trajectory: the whole ascent dashed (what will happen), the flown part solid in the live colour. */}
      <path d={ascent.d} fill="none" stroke={FG} strokeOpacity={0.35} strokeDasharray="3 5" />
      <path className="trail" d={ascent.d} fill="none" stroke="var(--live)" strokeWidth={1.5} strokeDasharray={ascent.length} strokeDashoffset={ascent.length} />
      {ret ? (
        <>
          <path d={ret.d} fill="none" stroke={FG} strokeOpacity={0.25} strokeDasharray="2 6" />
          <g transform={`translate(${ret.at(1).x} ${GROUND})`} fill="none" stroke={INK}>
            <ellipse rx={20} ry={4} />
            <ellipse rx={10} ry={2} />
          </g>
        </>
      ) : null}

      <g className="pad" transform={`translate(${pad.x} ${pad.y})`}>
        <line x1={-70} x2={70} y1={0} y2={0} stroke="#3a3a3a" />
        <rect x={-10} y={0} width={20} height={4} fill="#1e1e1e" stroke="#3a3a3a" />
        <line x1={-26} x2={-26} y1={0} y2={-h * HERO * 0.9} stroke="#4a4a4a" />
        <circle cx={-26} cy={-h * HERO * 0.9} r={1.4} fill="var(--live)" />
        <line className="strongback" x1={(body.x - 10) * HERO} x2={(body.x - 10) * HERO} y1={0} y2={-h * HERO * 0.72} stroke="#6b6b6b" strokeWidth={1.5} />
        <ellipse className="pad-glow" cx={0} cy={2} rx={16} ry={5} fill="url(#glowGrad)" opacity={0} />
      </g>

      {/* Milestones: a silhouette of the vehicle as it is at each event, a dot on the arc, and a label with a leader. */}
      {markers.map(({ i, e, cfg, pos, label }) => {
        const state = i < current ? 'past' : i === current ? 'current' : 'future'
        const { box, anchor } = label
        const dx = box.x - pos.x
        const dy = box.y - pos.y
        const tx = anchor === 'right' ? dx : anchor === 'left' ? dx + box.w : 0
        const leader =
          anchor === 'right' ? { x1: 6, y1: 0, x2: dx - 4, y2: 0 }
          : anchor === 'left' ? { x1: -6, y1: 0, x2: dx + box.w + 4, y2: 0 }
          : anchor.startsWith('above') ? { x1: 0, y1: -8, x2: 0, y2: dy + box.h + 4 }
          : { x1: 0, y1: 8, x2: 0, y2: dy - 4 }
        return (
          <g key={`${e.abbrev}-${i}`} transform={`translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})`}>
            {i > profile.liftoff ? (
              <g className="ink" transform={`rotate(${(cfg.return ? pos.angle + 180 : pos.angle).toFixed(1)}) scale(${ICON})`} stroke={INK} strokeWidth={1} fill={FILL} opacity={state === 'future' ? 0.7 : 1}>
                <Silhouette scene={scene} cfg={cfg} />
              </g>
            ) : null}
            <circle r={state === 'current' ? 3.5 : 2.5} fill={state === 'future' ? FILL : 'var(--live)'} stroke={state === 'future' ? INK : 'var(--live)'} />
            {showLabels || state === 'current' ? (
              <g>
                <line {...leader} stroke={INK} strokeDasharray="1 3" />
                <text x={tx} y={dy + 11} fontSize={10} letterSpacing={1} textAnchor={anchor === 'right' ? 'start' : anchor === 'left' ? 'end' : 'middle'} fill={state === 'current' ? 'var(--live)' : state === 'past' ? FG : INK} className="uppercase">
                  {e.abbrev}
                </text>
                <text x={tx} y={dy + 22} fontSize={9} textAnchor={anchor === 'right' ? 'start' : anchor === 'left' ? 'end' : 'middle'} fill={INK}>
                  {formatOffset(e.offsetSec)}
                </text>
              </g>
            ) : null}
          </g>
        )
      })}

      {/* The moving vehicle. Drawn once; render(pose) moves it and its parts. */}
      <g className="rocket ink" stroke={FG} strokeWidth={1} fill={FILL}>
        <g transform={`scale(${HERO})`}>
          {boosters.map((b, i) => {
            const side = b.x + b.w / 2 < 0 ? 'booster-l' : 'booster-r'
            return (
              <g key={i} className={side}>
                <BoosterShape b={b} />
                <g transform={`translate(${b.x + b.w / 2} ${b.y + b.h})`}>
                  <Flame className="flame-b" w={b.w * 1.1} len={b.h * 0.5} />
                </g>
              </g>
            )
          })}
          <g className="stage1">
            <rect x={body.x} y={stage1.y} width={w} height={stage1.h} />
            <rect x={body.x} y={stage1.y} width={w} height={bandH(stage1.h)} fill="#0a0a0a" />
            {style === 'falcon' ? <FalconGear body={body} stage1Y={stage1.y} h={h} /> : null}
            <Bells body={body} />
            <Flame className="flame1" w={w * 1.3} len={h * 0.7} />
          </g>
          <g className="stage2">
            {upper.map((s) => (
              <g key={s.label}>
                <rect x={body.x} y={s.y} width={w} height={s.h} />
                <rect x={body.x} y={s.y} width={w} height={bandH(s.h)} fill="#0a0a0a" />
              </g>
            ))}
            <g transform={`translate(0 ${stage1.y})`}>
              <Flame className="flame2" w={w * 0.8} len={h * 0.3} />
            </g>
          </g>
          {nose.kind === 'fairing' ? (
            <>
              <g className="payload" opacity={0}>
                <rect x={-w * 0.26} y={nose.y + nose.h * 0.34} width={w * 0.52} height={nose.h * 0.46} fill="#2a2a2a" />
                {[1, -1].map((side) => (
                  <g key={side} transform={`translate(${side * w * 0.3} ${nose.y + nose.h * 0.57}) scale(${side} 1)`}>
                    <g className="panel" transform="scale(0.05 1)">
                      <rect x={0} y={-nose.h * 0.05} width={w * 0.75} height={nose.h * 0.1} fill="#1f2a33" stroke="var(--live)" strokeOpacity={0.8} />
                    </g>
                  </g>
                ))}
              </g>
              <path className="fairing-l" d={halfL} />
              <path className="fairing-r" d={halfR} />
            </>
          ) : nose.kind === 'capsule' ? (
            <path className="payload" d={noseD(body.x, nose.y, w, nose.h, 'capsule')} />
          ) : (
            <g>
              <path d={noseD(body.x, nose.y, w, nose.h, nose.kind)} />
              {style === 'starship' ? <StarshipFlaps body={body} nose={nose} /> : null}
            </g>
          )}
        </g>
      </g>
    </svg>
  )
}

type Rect = Scene['body']
type Seg = Scene['segments'][number]

function BoosterShape({ b }: { b: Scene['boosters'][number] }) {
  return (
    <>
      {b.kind === 'liquid' ? (
        <path d={`M${b.x},${b.y + b.h} L${b.x + b.w * 0.28},${b.y} L${b.x + b.w * 0.72},${b.y} L${b.x + b.w},${b.y + b.h} Z`} />
      ) : (
        <rect x={b.x} y={b.y} width={b.w} height={b.h} />
      )}
      <path d={noseD(b.x + (b.kind === 'liquid' ? b.w * 0.28 : 0), b.y - b.w * 0.7, b.kind === 'liquid' ? b.w * 0.44 : b.w, b.w * 0.7, 'nose')} />
    </>
  )
}
function Bells({ body }: { body: Rect }) {
  return (
    <g fill="#2a2a2a">
      {[0.22, 0.5, 0.78].map((f) => (
        <path key={f} d={`M${body.x + body.w * f - 2.5},${-6} l5,0 l2,6 l-9,0 z`} />
      ))}
    </g>
  )
}
function FalconGear({ body, stage1Y, h }: { body: Rect; stage1Y: number; h: number }) {
  return (
    <g fill="#2a2a2a">
      <path d={`M${body.x},${-h * 0.1} L${body.x - 5},0 L${body.x},0 Z`} />
      <path d={`M${body.x + body.w},${-h * 0.1} L${body.x + body.w + 5},0 L${body.x + body.w},0 Z`} />
      <rect x={body.x - 4} y={stage1Y + 3} width={4} height={6} />
      <rect x={body.x + body.w} y={stage1Y + 3} width={4} height={6} />
    </g>
  )
}
function StarshipFlaps({ body, nose }: { body: Rect; nose: Seg }) {
  return (
    <>
      <rect x={body.x - 4} y={nose.y + nose.h * 0.72} width={4} height={nose.h * 0.2} />
      <rect x={body.x + body.w} y={nose.y + nose.h * 0.72} width={4} height={nose.h * 0.2} />
      <rect x={body.x - 3} y={nose.y + nose.h * 0.3} width={3} height={nose.h * 0.12} />
      <rect x={body.x + body.w} y={nose.y + nose.h * 0.3} width={3} height={nose.h * 0.12} />
    </>
  )
}

/** The vehicle as it is at one event, drawn still: which parts remain and which engines burn. Base of what remains at (0,0). */
function Silhouette({ scene, cfg }: { scene: Scene; cfg: Config }) {
  const { body, segments, boosters, style } = scene
  const stage1 = segments[0]!
  const nose = segments[segments.length - 1]!
  const upper = segments.slice(1, -1)
  const h = body.h
  const w = body.w
  const flame = (x: number, y: number, len: number, ww: number) => <path d={`M${x - ww / 2},${y} L${x},${y + len} L${x + ww / 2},${y}`} fill="none" stroke="var(--live)" />
  if (cfg.return) {
    return (
      <g>
        <rect x={body.x} y={stage1.y} width={w} height={stage1.h} />
        {style === 'falcon' ? <FalconGear body={body} stage1Y={stage1.y} h={h} /> : null}
        <Bells body={body} />
        {cfg.lit ? flame(0, 0, h * 0.25, w * 0.9) : null}
      </g>
    )
  }
  // WHY: once a part is gone, what remains sits on the marker, so the silhouette is shifted down to its own base.
  const baseY = cfg.deployed ? nose.y : cfg.stage1 ? 0 : stage1.y
  return (
    <g transform={`translate(0 ${-baseY})`}>
      {cfg.deployed ? (
        <g>
          <rect x={-w * 0.26} y={nose.y + nose.h * 0.34} width={w * 0.52} height={nose.h * 0.46} />
          <rect x={-w * 1.05} y={nose.y + nose.h * 0.52} width={w * 0.75} height={nose.h * 0.1} stroke="var(--live)" />
          <rect x={w * 0.3} y={nose.y + nose.h * 0.52} width={w * 0.75} height={nose.h * 0.1} stroke="var(--live)" />
        </g>
      ) : (
        <>
          {cfg.boosters
            ? boosters.map((b, i) => (
                <g key={i}>
                  <BoosterShape b={b} />
                  {cfg.engine1 ? flame(b.x + b.w / 2, b.y + b.h, b.h * 0.3, b.w) : null}
                </g>
              ))
            : null}
          {cfg.stage1 ? (
            <g>
              <rect x={body.x} y={stage1.y} width={w} height={stage1.h} />
              {style === 'falcon' ? <FalconGear body={body} stage1Y={stage1.y} h={h} /> : null}
              <Bells body={body} />
              {cfg.engine1 ? flame(0, 0, h * 0.35, w * 1.2) : null}
            </g>
          ) : null}
          {upper.map((s) => (
            <rect key={s.label} x={body.x} y={s.y} width={w} height={s.h} />
          ))}
          {cfg.engine2 && upper.length > 0 ? flame(0, stage1.y, h * 0.18, w * 0.7) : null}
          {nose.kind === 'fairing' && !cfg.fairing ? (
            <rect x={-w * 0.26} y={nose.y + nose.h * 0.34} width={w * 0.52} height={nose.h * 0.46} />
          ) : nose.kind === 'fairing' ? (
            <path d={noseD(body.x, nose.y, w, nose.h, 'fairing')} />
          ) : (
            <>
              <path d={noseD(body.x, nose.y, w, nose.h, nose.kind)} />
              {style === 'starship' ? <StarshipFlaps body={body} nose={nose} /> : null}
            </>
          )}
        </>
      )}
    </g>
  )
}

/** Exhaust: blurred cones in the live colour with a white core, plus particles that render() moves. Nozzle at (0,0), plume along +y. */
function Flame({ className, w, len }: { className: string; w: number; len: number }) {
  const cone = (ww: number, ll: number) => `M${-ww / 2},0 Q0,${ll * 0.25} 0,${ll} Q0,${ll * 0.25} ${ww / 2},0 Z`
  return (
    <g className={className} stroke="none" opacity={0} aria-hidden="true">
      <path d={cone(w * 2.2, len)} fill="url(#plume)" filter="url(#softer)" opacity={0.35} />
      <path d={cone(w * 1.2, len * 0.65)} fill="url(#plume)" filter="url(#soft)" opacity={0.85} />
      <path d={cone(w * 0.45, len * 0.3)} fill="#ffffff" opacity={0.95} />
      {Array.from({ length: PARTICLES }, (_, i) => (
        <circle key={i} className="pt" r={1} fill={i % 3 === 0 ? '#ffffff' : 'var(--live)'} opacity={0} />
      ))}
    </g>
  )
}
