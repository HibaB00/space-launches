// Layout maths for the vehicle schematic. Pure; the SVG component only draws what this returns.
import type { Vehicle } from './launches'

export const HUMAN_M = 1.8
/** Falcon 9, the most-flown rocket today, as the size reference everyone has seen. */
export const REFERENCE = { label: 'Falcon 9', lengthM: 70 }

// WHY: LL2 publishes overall length and diameter but not per-stage lengths. These are typical splits of the
// body height by stage count (remainder = nose: fairing or capsule). Labelled as typical in the UI.
const STAGE_SPLIT: Record<number, number[]> = {
  1: [0.85],
  2: [0.6, 0.2],
  3: [0.5, 0.2, 0.12],
  4: [0.45, 0.18, 0.12, 0.08],
}

export type Segment = { label: string; kind: 'stage' | 'fairing' | 'capsule' | 'nose'; y: number; h: number }
export type Rect = { x: number; y: number; w: number; h: number }
export type SchematicLayout = {
  width: number
  height: number
  ground: number
  /** pixels per metre */
  scale: number
  body: Rect
  segments: Segment[]
  boosters: Rect[]
  human: { x: number; h: number }
  reference: { y: number; label: string } | null
}

export function schematicLayout(v: Pick<Vehicle, 'lengthM' | 'diameterM' | 'stages' | 'boosters' | 'spacecraft'>, width = 280, height = 320): SchematicLayout | null {
  if (!v.lengthM || !v.diameterM) return null
  const top = 24
  const ground = height - 28
  // One scale for everything so the human, the reference line and the vehicle are comparable.
  const tallest = Math.max(v.lengthM, REFERENCE.lengthM)
  const scale = (ground - top) / tallest
  const h = v.lengthM * scale
  const w = Math.max(6, v.diameterM * scale)
  const cx = 110
  const body: Rect = { x: cx - w / 2, y: ground - h, w, h }

  const stages = Math.min(4, Math.max(1, v.stages ?? 2))
  const split = STAGE_SPLIT[stages]!
  const segments: Segment[] = []
  let y = ground
  split.forEach((frac, i) => {
    const sh = h * frac
    y -= sh
    segments.push({ label: `Stage ${i + 1}`, kind: 'stage', y, h: sh })
  })
  const noseH = h * (1 - split.reduce((a, b) => a + b, 0))
  segments.push({
    label: v.spacecraft ? v.spacecraft.config || v.spacecraft.name : stages === 1 ? 'Nose' : 'Fairing',
    kind: v.spacecraft ? 'capsule' : stages === 1 ? 'nose' : 'fairing',
    y: y - noseH,
    h: noseH,
  })

  // Strap-on boosters (anything that isn't the core) drawn alternately left and right of the body.
  const strapOns = v.boosters.filter((b) => !/core|sustainer/i.test(b.type))
  const boosters: Rect[] = strapOns.slice(0, 6).map((_, i) => {
    const bw = Math.max(4, w * 0.55)
    const bh = h * 0.42
    const side = i % 2 === 0 ? -1 : 1
    const rank = Math.floor(i / 2) + 1
    return { x: cx + side * (w / 2 + bw * (rank - 0.5) + 2 * rank) - bw / 2, y: ground - bh, w: bw, h: bh }
  })

  return {
    width,
    height,
    ground,
    scale,
    body,
    segments,
    boosters,
    human: { x: 30, h: HUMAN_M * scale },
    reference: v.lengthM === REFERENCE.lengthM ? null : { y: ground - REFERENCE.lengthM * scale, label: `${REFERENCE.label} · ${REFERENCE.lengthM} m` },
  }
}
