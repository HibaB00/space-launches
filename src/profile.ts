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

/** Events that belong to the first stage's return (drawn on the return leg), not the ascent. */
export const isReturnEvent = (e: TimelineEvent) => /entry burn|landing|boostback|flip|grid fin/i.test(`${e.abbrev} ${e.description}`)

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
  const ret = isReturnEvent(e)
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
