// Pure rules for the animated launch sequence. Ordinal positions (0..n-1 across events), interpolated clocks,
// compressed playback times, and which animation beat each event triggers. Tested; no React, no DOM.
import type { TimelineEvent } from './launches'

/** Live ordinal position for a real elapsed time, or null when the sequence isn't running (before it starts, or 10 min after it ends). */
export function ordinalAt(events: TimelineEvent[], tSec: number): number | null {
  const n = events.length
  if (n === 0) return null
  const first = events[0]!.offsetSec
  const last = events[n - 1]!.offsetSec
  if (tSec < first || tSec > last + 600) return null
  if (tSec >= last) return n - 1
  const i = events.findIndex((e, k) => tSec >= e.offsetSec && tSec < events[k + 1]!.offsetSec)
  const a = events[i]!.offsetSec
  const b = events[i + 1]!.offsetSec
  return i + (tSec - a) / (b - a)
}

/** Sequence clock (seconds from T-0) at an ordinal position, linear between neighbouring events. */
export function clockAt(events: TimelineEvent[], ordinal: number): number {
  const n = events.length
  const i = Math.max(0, Math.min(n - 2, Math.floor(ordinal)))
  const f = Math.max(0, Math.min(1, ordinal - i))
  if (n === 1) return events[0]!.offsetSec
  return events[i]!.offsetSec + f * (events[i + 1]!.offsetSec - events[i]!.offsetSec)
}

// WHY: playback compresses time. Countdown steps (prop load, chill, startup…) are housekeeping: 0.8 s each;
// flight steps are the show: 2.4 s each. Nine minutes of flight becomes ~20 s of animation.
export function segmentDuration(events: TimelineEvent[], i: number): number {
  const next = events[Math.min(events.length - 1, i + 1)]!
  return next.offsetSec <= 0 ? 0.8 : 2.4
}

const text = (e: TimelineEvent) => `${e.abbrev} ${e.description}`

export type EventKind = 'ignition' | 'liftoff' | 'maxq' | 'boosterSep' | 'meco' | 'stageSep' | 'ses' | 'seco' | 'fairing' | 'deploy' | 'landing' | 'other'

/** Which animation beat an event triggers. Order matters: "Stage 1 Landing Burn" is a landing beat, not staging. */
export function classifyEvent(e: TimelineEvent): EventKind {
  const t = text(e)
  if (/landing/i.test(t)) return 'landing'
  if (/fairing/i.test(t)) return 'fairing'
  if (/deploy|payload sep|spacecraft sep/i.test(t)) return 'deploy'
  if (/booster.*sep|side core|\bSRB/i.test(t)) return 'boosterSep'
  if (/\bSECO(?:-\d)?\b/i.test(t)) return 'seco'
  if (/\bSES-?\d\b|second engine start|second stage ignition/i.test(t)) return 'ses'
  if (/stage ?2 sep|stage sep|stage separation|staging|stage ?1 sep/i.test(t)) return 'stageSep'
  if (/\bMECO\b|main engine cut/i.test(t)) return 'meco'
  if (/max-?q/i.test(t)) return 'maxq'
  if (/liftoff|lift-off/i.test(t)) return 'liftoff'
  if (/ignition/i.test(t)) return 'ignition'
  return 'other'
}

/** Cumulative playback time (s) at which each event starts, from the per-segment durations. */
export function eventTimes(events: TimelineEvent[]): number[] {
  const times = [0]
  for (let i = 1; i < events.length; i++) times.push(times[i - 1]! + segmentDuration(events, i - 1))
  return times
}

/** Playback time → ordinal position, inverse of eventTimes. */
export function ordinalOfTime(times: number[], t: number): number {
  const n = times.length
  if (n < 2) return 0
  if (t <= 0) return 0
  if (t >= times[n - 1]!) return n - 1
  const i = times.findIndex((s, k) => t >= s && t < times[k + 1]!)
  return i + (t - times[i]!) / (times[i + 1]! - times[i]!)
}

/** Ordinal position → playback time, inverse of ordinalOfTime. */
export function timeOfOrdinal(times: number[], ordinal: number): number {
  const n = times.length
  const i = Math.max(0, Math.min(n - 2, Math.floor(ordinal)))
  const f = Math.max(0, Math.min(1, ordinal - i))
  return n < 2 ? 0 : times[i]! + f * (times[i + 1]! - times[i]!)
}

/**
 * Typical altitude (km) and speed (km/s) at each kind of event, from published Falcon 9 / Atlas / Ariane webcast
 * telemetry rounded to what every medium-lift orbital launch roughly shares. WHY: no trajectory is published before a
 * launch, but the webcast's two numbers are the physics lesson (MECO at ~2 km/s and 70 km; orbit at ~7.8 km/s), so the
 * readout shows these, labelled typical, interpolated between events.
 */
const TYPICAL: Partial<Record<EventKind, { altKm: number; kmps: number }>> = {
  ignition: { altKm: 0, kmps: 0 },
  liftoff: { altKm: 0, kmps: 0 },
  maxq: { altKm: 12, kmps: 0.45 },
  boosterSep: { altKm: 45, kmps: 1.6 },
  meco: { altKm: 70, kmps: 2.2 },
  stageSep: { altKm: 75, kmps: 2.2 },
  ses: { altKm: 80, kmps: 2.3 },
  fairing: { altKm: 110, kmps: 2.8 },
  seco: { altKm: 200, kmps: 7.8 },
  deploy: { altKm: 300, kmps: 7.7 },
}

/** The typical altitude/speed at a flight ordinal, or null before liftoff and for events (landings) the table does not cover. */
export function typicalTelemetry(events: TimelineEvent[], ordinal: number): { altKm: number; kmps: number } | null {
  const known = events.map((e, i) => ({ i, t: TYPICAL[classifyEvent(e)] })).filter((x): x is { i: number; t: { altKm: number; kmps: number } } => !!x.t)
  const liftoff = events.findIndex((e) => classifyEvent(e) === 'liftoff')
  if (liftoff < 0 || ordinal < liftoff || known.length === 0) return null
  const after = known.filter((k) => k.i >= liftoff)
  if (after.length === 0) return null
  const prev = [...after].reverse().find((k) => k.i <= ordinal)
  const next = after.find((k) => k.i >= ordinal)
  if (!prev) return null
  if (!next || next.i === prev.i) return prev.t
  const f = (ordinal - prev.i) / (next.i - prev.i)
  return { altKm: prev.t.altKm + f * (next.t.altKm - prev.t.altKm), kmps: prev.t.kmps + f * (next.t.kmps - prev.t.kmps) }
}
