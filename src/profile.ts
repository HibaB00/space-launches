// Pure maths for the flight-profile diagram: arc-length sampled curves (so markers are spaced by distance along the
// arc, not by Bézier parameter) and the vehicle's configuration at each event. Tested; no React, no DOM.
import type { TimelineEvent } from './launches'
import { classifyEvent } from './sequence'

export type Pt = { x: number; y: number }
export type Arc = { d: string; length: number; at(u: number): Pt & { angle: number } }

/** A cubic Bézier sampled into an arc-length table. at(u) returns the point u of the way along, and the heading in degrees (0 = up, clockwise). */
export function arc(p0: Pt, p1: Pt, p2: Pt, p3: Pt, samples = 240): Arc {
  const pts: Pt[] = []
  const cum: number[] = [0]
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const q = 1 - t
    pts.push({
      x: q * q * q * p0.x + 3 * q * q * t * p1.x + 3 * q * t * t * p2.x + t * t * t * p3.x,
      y: q * q * q * p0.y + 3 * q * q * t * p1.y + 3 * q * t * t * p2.y + t * t * t * p3.y,
    })
    if (i > 0) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y))
  }
  const length = cum[samples]!
  return {
    d: `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`,
    length,
    at(u) {
      const s = Math.min(1, Math.max(0, u)) * length
      let i = 0
      while (i < samples - 1 && cum[i + 1]! < s) i++
      const a = pts[i]!
      const b = pts[i + 1]!
      const seg = cum[i + 1]! - cum[i]!
      const f = seg > 0 ? (s - cum[i]!) / seg : 0
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, angle: (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI }
    },
  }
}

/** A quadratic Bézier (one control point) as an Arc. */
export const quadratic = (p0: Pt, c: Pt, p3: Pt): Arc =>
  arc(p0, { x: p0.x + (2 / 3) * (c.x - p0.x), y: p0.y + (2 / 3) * (c.y - p0.y) }, { x: p3.x + (2 / 3) * (c.x - p3.x), y: p3.y + (2 / 3) * (c.y - p3.y) }, p3)

const RETURN_WORDS = /entry burn|landing|boostback|flip|grid fin/i
const UPPER_WORDS = /starship|\bship\b|dragon|capsule|orion|stage ?2|second stage|upper stage|payload/i
/**
 * Events that belong to the first stage's return (drawn on the return leg), not the ascent.
 * WHY: a booster lands while the second stage is still burning, so a landing before SECO is the booster's; a landing
 * after it (Starship's flip and splashdown at T+1:05, Dragon's landing) is the upper stage's and stays on the ascent.
 */
export function isReturnEvent(events: TimelineEvent[], i: number): boolean {
  const e = events[i]!
  const text = `${e.abbrev} ${e.description}`
  if (!RETURN_WORDS.test(text)) return false
  const seco = events.findIndex((x) => classifyEvent(x) === 'seco')
  return seco >= 0 ? i < seco : !UPPER_WORDS.test(text)
}

export type Config = { boosters: boolean; stage1: boolean; fairing: boolean; deployed: boolean; engine1: boolean; engine2: boolean; return: boolean; lit: boolean }

/** What the vehicle looks like at event i: the same back-fill rules as buildTimeline (pose.ts), without the tweens. */
export function configAt(events: TimelineEvent[], i: number, { hasBoosters, hasFairing }: { hasBoosters: boolean; hasFairing: boolean }): Config {
  let boosters = hasBoosters
  let stage1 = true
  let fairing = hasFairing
  let deployed = false
  let engine1 = false
  let engine2 = false
  for (let k = 0; k <= i; k++) {
    switch (classifyEvent(events[k]!)) {
      case 'ignition':
      case 'liftoff':
        engine1 = true
        break
      case 'boosterSep':
        boosters = false
        break
      case 'meco':
        boosters = false
        engine1 = false
        break
      case 'stageSep':
      case 'ses':
        boosters = false
        stage1 = false
        engine1 = false
        engine2 = classifyEvent(events[k]!) === 'ses'
        break
      case 'seco':
        engine2 = false
        fairing = false
        break
      case 'fairing':
        fairing = false
        break
      case 'deploy':
        fairing = false
        deployed = true
        break
      default:
        break
    }
  }
  const e = events[i]!
  const ret = isReturnEvent(events, i)
  return { boosters, stage1, fairing, deployed, engine1, engine2, return: ret, lit: ret && /burn/i.test(e.abbrev) && !/shutdown|end|cut/i.test(e.abbrev) }
}

export type Box = { x: number; y: number; w: number; h: number }
export type Anchor = 'below' | 'below-far' | 'above' | 'above-far' | 'right' | 'left'
export const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** Leader length for the near and far rows below/above a marker. */
export const LEADER = { near: 40, far: 76 }

/**
 * Greedy label placement. For each marker in order, try the anchors and take the first label box that stays inside the
 * frame and clear of everything reserved so far (the readout, every silhouette, earlier labels). Falls back to 'below'.
 */
export function placeLabels(markers: { x: number; y: number; w: number; h: number; prefer?: Anchor[] }[], frame: { w: number; h: number }, reserved: Box[]): { box: Box; anchor: Anchor }[] {
  const taken = [...reserved]
  const gap = 6
  const boxFor = (m: { x: number; y: number; w: number; h: number }, a: Anchor): Box => {
    switch (a) {
      case 'below':
        return { x: m.x - m.w / 2, y: m.y + LEADER.near + gap, w: m.w, h: m.h }
      case 'below-far':
        return { x: m.x - m.w / 2, y: m.y + LEADER.far + gap, w: m.w, h: m.h }
      case 'above':
        return { x: m.x - m.w / 2, y: m.y - LEADER.near - gap - m.h, w: m.w, h: m.h }
      case 'above-far':
        return { x: m.x - m.w / 2, y: m.y - LEADER.far - gap - m.h, w: m.w, h: m.h }
      case 'right':
        return { x: m.x + 18, y: m.y - m.h / 2, w: m.w, h: m.h }
      case 'left':
        return { x: m.x - 18 - m.w, y: m.y - m.h / 2, w: m.w, h: m.h }
    }
  }
  const inFrame = (b: Box) => b.x >= 2 && b.y >= 2 && b.x + b.w <= frame.w - 2 && b.y + b.h <= frame.h - 4
  return markers.map((m) => {
    const order = m.prefer ?? ['below', 'above', 'below-far', 'above-far', 'right', 'left']
    for (const anchor of order) {
      const box = boxFor(m, anchor)
      if (inFrame(box) && !taken.some((t) => overlaps(t, box))) {
        taken.push(box)
        return { box, anchor }
      }
    }
    const box = boxFor(m, order[0]!)
    taken.push(box)
    return { box, anchor: order[0]! }
  })
}

const DESCENT_WORDS = /entry|re-?entry|deorbit|transonic|subsonic|flip|landing|splashdown|touchdown|parachute|chute/i
/**
 * Index of the upper stage's first descent event (Starship's deorbit burn and belly-flop, Dragon's re-entry), or -1.
 * WHY: only after SECO can the upper stage come down; those events are drawn on a descent leg at the right, not piled
 * onto the end of the ascent.
 */
export function descentStart(events: TimelineEvent[]): number {
  const seco = events.findIndex((e) => classifyEvent(e) === 'seco')
  return seco < 0 ? -1 : events.findIndex((e, k) => k > seco && DESCENT_WORDS.test(`${e.abbrev} ${e.description}`))
}

/** Indices of the flight events on the ascent arc: from liftoff on, minus the booster's return and the upper stage's descent. */
export function ascentIndices(events: TimelineEvent[], liftoff: number): number[] {
  const d = descentStart(events)
  return events.map((_, i) => i).filter((i) => i >= liftoff && (d < 0 || i < d) && !isReturnEvent(events, i))
}

/** Indices of the upper stage's descent events, in order. */
export function descentIndices(events: TimelineEvent[]): number[] {
  const d = descentStart(events)
  return d < 0 ? [] : events.map((_, i) => i).filter((i) => i >= d && !isReturnEvent(events, i))
}

/** 0..1 along a path whose waypoints are the given event indices, piecewise linear in the flight ordinal. */
export function pathU(indices: number[], ordinal: number): number {
  if (indices.length < 2) return 0
  const uOf = (k: number) => k / (indices.length - 1)
  if (ordinal <= indices[0]!) return 0
  if (ordinal >= indices[indices.length - 1]!) return 1
  for (let k = 1; k < indices.length; k++) {
    const a = indices[k - 1]!
    const b = indices[k]!
    if (ordinal <= b) return uOf(k - 1) + ((ordinal - a) / (b - a)) * (uOf(k) - uOf(k - 1))
  }
  return 1
}

/**
 * Position along the ascent arc (0..1) of a flight ordinal. Return and descent events take time without moving the
 * vehicle along the ascent, so the hero still lands on each ascent marker at its event.
 */
export const ascentU = (events: TimelineEvent[], liftoff: number, ordinal: number) => pathU(ascentIndices(events, liftoff), ordinal)

/** Position along the descent leg (0..1): 0 at the last ascent event, 1 at the last descent event. */
export function descentU(events: TimelineEvent[], liftoff: number, ordinal: number): number {
  const asc = ascentIndices(events, liftoff)
  const des = descentIndices(events)
  return des.length === 0 ? 0 : pathU([asc[asc.length - 1] ?? liftoff, ...des], ordinal)
}

export type MarkerGroup = { i: number; e: TimelineEvent; until: TimelineEvent | null }

/**
 * One marker per burn or sequence: "entry burn startup" + "entry burn shutdown" become one "entry burn" marker with
 * both times, the way SpaceX's own profile draws them. WHY: six return events two seconds apart cannot each carry a label.
 */
export function collapseBurns(events: TimelineEvent[], from = 0): MarkerGroup[] {
  const out: MarkerGroup[] = []
  const consumed = new Set<number>()
  for (let i = from; i < events.length; i++) {
    if (consumed.has(i)) continue
    const e = events[i]!
    const start = e.abbrev.match(/^(.+?)\s*(startup|start|ignition|begin)$/i)
    // WHY: the end is not always the next event: a Falcon 9 boostback burn brackets the fairing separation.
    const endRe = start ? new RegExp(`^${start[1]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(shutdown|cutoff|cut-off|end|complete)$`, 'i') : null
    const j = endRe ? events.findIndex((x, k) => k > i && k <= i + 3 && endRe.test(x.abbrev)) : -1
    if (start && j > 0) {
      consumed.add(j)
      out.push({ i, e: { ...e, abbrev: start[1]! }, until: events[j]! })
    } else out.push({ i, e, until: null })
  }
  return out
}
