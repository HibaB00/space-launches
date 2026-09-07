import type { Vehicle } from './launches'
import { schematicLayout, type Segment } from './vehicle'

const FG = 'var(--foreground)'
const DIM = 'var(--muted-foreground)'
const FILL = 'var(--card)'

/** Nose shapes: an ogive fairing, a capsule (wide base, domed top), or a plain cone for single-stage vehicles. */
function noseD(x: number, y: number, w: number, h: number, kind: Segment['kind']): string {
  if (kind === 'ship') return `M${x},${y + h} L${x},${y + h * 0.3} Q${x},${y} ${x + w / 2},${y} Q${x + w},${y} ${x + w},${y + h * 0.3} L${x + w},${y + h} Z`
  if (kind === 'capsule') return `M${x},${y + h} L${x + w * 0.15},${y + h * 0.35} Q${x + w / 2},${y - h * 0.05} ${x + w * 0.85},${y + h * 0.35} L${x + w},${y + h} Z`
  if (kind === 'nose') return `M${x},${y + h} L${x + w / 2},${y} L${x + w},${y + h} Z`
  return `M${x},${y + h} L${x},${y + h * 0.45} Q${x},${y} ${x + w / 2},${y} Q${x + w},${y} ${x + w},${y + h * 0.45} L${x + w},${y + h} Z`
}

/**
 * The vehicle to scale, next to a 1.8 m human and a dashed Falcon 9 (70 m) line for size.
 * Proportions come from published length and diameter; the stage split is typical, not measured (see vehicle.ts).
 */
export function VehicleSchematic({ vehicle }: { vehicle: Vehicle }) {
  const l = schematicLayout(vehicle)
  if (!l) return null
  const { body, ground, segments, boosters, human, reference, width, height, style } = l
  // WHY: label rows are pushed apart so short upper stages (a 4-stage Vega-C has 8 % segments) don't overprint.
  const labelYs: number[] = []
  let prev = -Infinity
  for (const s of [...segments].reverse()) {
    const y = Math.max(prev + 12, s.y + s.h / 2)
    labelYs.unshift(y)
    prev = y
  }
  const labelX = 172
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Schematic of ${vehicle.name}: ${segments.map((s) => s.label).join(', ')}. ${vehicle.lengthM} m tall, ${vehicle.diameterM} m across.`}
      className="h-auto w-full max-w-[300px] text-[9px] uppercase tracking-widest"
    >
      <line x1={8} x2={width - 8} y1={ground} y2={ground} stroke="var(--border)" />
      {reference ? (
        <g>
          <line x1={16} x2={width - 16} y1={reference.y} y2={reference.y} stroke={DIM} strokeDasharray="3 3" />
          <text x={width - 16} y={reference.y - 4} textAnchor="end" fill={DIM}>
            {reference.label}
          </text>
        </g>
      ) : null}
      <g stroke={DIM} fill="none">
        <circle cx={human.x} cy={ground - human.h + 1.3} r={1.3} />
        <line x1={human.x} x2={human.x} y1={ground - human.h + 2.6} y2={ground} />
      </g>
      <text x={human.x} y={ground + 12} textAnchor="middle" fill={DIM}>
        1.8 m
      </text>
      {boosters.map((b, i) =>
        b.kind === 'liquid' ? (
          // Soyuz-style strap-on: tapered, with a short cone.
          <g key={i} fill={FILL} stroke={FG}>
            <path d={`M${b.x},${b.y + b.h} L${b.x + b.w * 0.28},${b.y} L${b.x + b.w * 0.72},${b.y} L${b.x + b.w},${b.y + b.h} Z`} />
            <path d={noseD(b.x + b.w * 0.28, b.y - b.w * 0.5, b.w * 0.44, b.w * 0.5, 'nose')} />
          </g>
        ) : (
          <g key={i} fill={FILL} stroke={FG}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} />
            <path d={noseD(b.x, b.y - b.w * 0.9, b.w, b.w * 0.9, 'nose')} />
          </g>
        ),
      )}
      {segments.map((s) =>
        s.kind === 'stage' ? (
          <rect key={s.label} x={body.x} y={s.y} width={body.w} height={s.h} fill={FILL} stroke={FG} />
        ) : (
          <path key={s.label} d={noseD(body.x, s.y, body.w, s.h, s.kind)} fill={FILL} stroke={FG} />
        ),
      )}
      <g fill={FILL} stroke={FG}>
        {[0.25, 0.5, 0.75].map((f) => (
          <path key={f} d={`M${body.x + body.w * f - 1.5},${ground - 5} l3,0 l1.5,5 l-6,0 z`} />
        ))}
      </g>
      {style === 'falcon' ? (
        // Landing legs folded along the base and grid fins at the top of the first stage: the Falcon silhouette.
        <g stroke={FG} fill={FILL}>
          <path d={`M${body.x},${ground - body.h * 0.12} L${body.x - 4},${ground} L${body.x},${ground} Z`} />
          <path d={`M${body.x + body.w},${ground - body.h * 0.12} L${body.x + body.w + 4},${ground} L${body.x + body.w},${ground} Z`} />
          <rect x={body.x - 3} y={segments[0]!.y + 2} width={3} height={4} />
          <rect x={body.x + body.w} y={segments[0]!.y + 2} width={3} height={4} />
        </g>
      ) : null}
      {style === 'starship' && segments[1] ? (
        // Forward and aft flaps on the ship.
        <g stroke={FG} fill={FILL}>
          <rect x={body.x - 3} y={segments[1].y + segments[1].h * 0.72} width={3} height={segments[1].h * 0.2} />
          <rect x={body.x + body.w} y={segments[1].y + segments[1].h * 0.72} width={3} height={segments[1].h * 0.2} />
          <rect x={body.x - 2} y={segments[1].y + segments[1].h * 0.3} width={2} height={segments[1].h * 0.12} />
          <rect x={body.x + body.w} y={segments[1].y + segments[1].h * 0.3} width={2} height={segments[1].h * 0.12} />
        </g>
      ) : null}
      {segments.map((s, i) => {
        const y = s.y + s.h / 2
        return (
          <g key={s.label} stroke={DIM}>
            <polyline points={`${body.x + body.w + 4},${y} ${labelX - 8},${labelYs[i]} ${labelX - 2},${labelYs[i]}`} fill="none" />
            <text x={labelX + 2} y={labelYs[i]! + 3} fill={FG} stroke="none">
              {s.label}
            </text>
          </g>
        )
      })}
      <text x={body.x - 8} y={body.y + 9} textAnchor="end" fill={DIM}>
        {vehicle.lengthM} m
      </text>
      <text x={body.x + body.w / 2} y={body.y - 7} textAnchor="middle" fill={DIM}>
        ⌀ {vehicle.diameterM} m
      </text>
    </svg>
  )
}
