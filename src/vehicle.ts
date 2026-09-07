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

export type BoosterKind = 'solid' | 'liquid' | 'core'
export type BoosterInference = { count: number; kind: BoosterKind; name: string; source: 'll2' | 'name' | 'none'; note: string }

// WHY: LL2 lists the cores that fly but rarely the strap-on boosters, and it has no engine data. Rocket names
// encode the configuration (H3-24 = 2 engines, 4 boosters; Ariane 64 = 4 boosters; Vulcan VC4 = 4 solids;
// Atlas V 551 = 5 solids), and a handful of families always fly the same way (Soyuz: four liquid strap-ons).
// Reference knowledge, labelled as such in the UI; LL2's own stage list wins when it names strap-ons.
const NAME_RULES: { test: RegExp; boosters: (m: RegExpMatchArray) => number; kind: BoosterKind; name: string; engines?: (m: RegExpMatchArray) => string }[] = [
  { test: /^H3-(\d)(\d)/, boosters: (m) => Number(m[2]), kind: 'solid', name: 'SRB-3 solid booster', engines: (m) => `${m[1]} × LE-9` },
  { test: /^Ariane 6(\d)/, boosters: (m) => Number(m[1]), kind: 'solid', name: 'P120C solid booster', engines: () => '1 × Vulcain 2.1' },
  { test: /^Vulcan VC(\d)/, boosters: (m) => Number(m[1]), kind: 'solid', name: 'GEM 63XL solid booster', engines: () => '2 × BE-4' },
  { test: /^Atlas V \d(\d)\d/, boosters: (m) => Number(m[1]), kind: 'solid', name: 'solid rocket booster', engines: () => '1 × RD-180' },
  { test: /^Soyuz/, boosters: () => 4, kind: 'liquid', name: 'Blok-B/V/G/D liquid booster', engines: () => '4 × RD-107A + 1 × RD-108A' },
  { test: /^Falcon Heavy/, boosters: () => 2, kind: 'core', name: 'side core (a Falcon 9 first stage)', engines: () => '27 × Merlin 1D' },
  { test: /^Falcon 9/, boosters: () => 0, kind: 'solid', name: '', engines: () => '9 × Merlin 1D' },
  { test: /^Starship/, boosters: () => 0, kind: 'solid', name: '', engines: () => '33 × Raptor (Super Heavy)' },
  { test: /^Electron/, boosters: () => 0, kind: 'solid', name: '', engines: () => '9 × Rutherford' },
  { test: /^Long March (5|7|3B|2F)/, boosters: () => 4, kind: 'liquid', name: 'liquid booster' },
  { test: /^Long March 8\b/, boosters: () => 2, kind: 'liquid', name: 'liquid booster' },
  { test: /^Delta IV Heavy/, boosters: () => 2, kind: 'core', name: 'Common Booster Core', engines: () => '3 × RS-68A' },
  { test: /^(Nuri|KSLV)/, boosters: () => 0, kind: 'solid', name: '', engines: () => '4 × KRE-075' },
  { test: /^Vega/, boosters: () => 0, kind: 'solid', name: '', engines: () => 'P120C solid first stage' },
]

export function inferBoosters(v: Pick<Vehicle, 'name' | 'boosters'>): BoosterInference {
  const strapOns = v.boosters.filter((b) => !/core|sustainer/i.test(b.type))
  if (strapOns.length > 0) {
    const solid = strapOns.some((b) => /solid|srb|gem|p120/i.test(b.type))
    return { count: strapOns.length, kind: solid ? 'solid' : 'liquid', name: strapOns[0]!.type, source: 'll2', note: 'from the launch record' }
  }
  for (const rule of NAME_RULES) {
    const m = v.name.match(rule.test)
    if (m) {
      const count = rule.boosters(m)
      return { count, kind: rule.kind, name: rule.name, source: count > 0 ? 'name' : 'none', note: count > 0 ? `inferred from the configuration name ${v.name.split(' ').slice(0, 2).join(' ')}` : '' }
    }
  }
  return { count: 0, kind: 'solid', name: '', source: 'none', note: '' }
}

/** First-stage engines by family, reference knowledge (manufacturer specs), or null when unknown. */
export function knownEngines(name: string): string | null {
  for (const rule of NAME_RULES) {
    const m = name.match(rule.test)
    if (m) return rule.engines ? rule.engines(m) : null
  }
  return null
}

export type FamilyStyle = 'falcon' | 'starship' | 'soyuz' | 'default'
export const familyStyle = (name: string): FamilyStyle =>
  /^Falcon/.test(name) ? 'falcon' : /^Starship/.test(name) ? 'starship' : /^Soyuz/.test(name) ? 'soyuz' : 'default'

export type Segment = { label: string; kind: 'stage' | 'fairing' | 'capsule' | 'nose' | 'ship'; y: number; h: number }
export type Rect = { x: number; y: number; w: number; h: number; kind?: BoosterKind }
export type SchematicLayout = {
  width: number
  height: number
  ground: number
  /** pixels per metre */
  scale: number
  body: Rect
  segments: Segment[]
  boosters: Rect[]
  style: FamilyStyle
  human: { x: number; h: number }
  reference: { y: number; label: string } | null
}

export function schematicLayout(v: Pick<Vehicle, 'name' | 'lengthM' | 'diameterM' | 'stages' | 'boosters' | 'spacecraft'>, width = 280, height = 320): SchematicLayout | null {
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

  const style = familyStyle(v.name)
  const stages = Math.min(4, Math.max(1, v.stages ?? 2))
  const segments: Segment[] = []
  let y = ground
  if (style === 'starship') {
    // WHY: Starship has no fairing; the ship *is* the second stage and the payload bay. Booster 71 m of 121 m.
    segments.push({ label: 'Super Heavy', kind: 'stage', y: ground - h * 0.58, h: h * 0.58 })
    segments.push({ label: 'Starship', kind: 'ship', y: ground - h, h: h * 0.42 })
  } else {
    const split = STAGE_SPLIT[stages]!
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
  }

  // Strap-on boosters, alternately left and right; two per side at most in a side view.
  const inferred = inferBoosters(v)
  const boosters: Rect[] = Array.from({ length: Math.min(4, inferred.count) }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const rank = Math.floor(i / 2) // 0 = inner pair, 1 = outer pair
    const bw = inferred.kind === 'core' ? w : Math.max(4, w * (inferred.kind === 'solid' ? 0.42 : 0.6))
    // WHY: a side core (Falcon Heavy) is a whole first stage; solids and liquid strap-ons are shorter than stage 1.
    const bh = inferred.kind === 'core' ? (segments[0]?.h ?? h * 0.6) : h * (inferred.kind === 'solid' ? 0.42 : 0.38)
    const gap = 2 + rank * 2
    const offset = w / 2 + gap + bw * rank + bw / 2
    return { x: cx + side * offset - bw / 2, y: ground - bh, w: bw, h: bh, kind: inferred.kind }
  })

  return {
    width,
    height,
    ground,
    scale,
    body,
    segments,
    boosters,
    style,
    human: { x: 30, h: HUMAN_M * scale },
    reference: v.lengthM === REFERENCE.lengthM ? null : { y: ground - REFERENCE.lengthM * scale, label: `${REFERENCE.label} · ${REFERENCE.lengthM} m` },
  }
}
