// Pure rules for the animated launch sequence. Ordinal positions (0..n-1 across events), interpolated clocks,
// and which parts of the rocket have gone by a given event. Tested; no React, no DOM.
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

export type FlightState = {
  lifted: boolean
  mainEngine: boolean
  boostersOff: boolean
  stage1Off: boolean
  fairingOff: boolean
  secondEngine: boolean
  deployed: boolean
  landed: boolean
}

const text = (e: TimelineEvent) => `${e.abbrev} ${e.description}`

/**
 * What has happened by event `idx`, from the event names. Rules are regexes over LL2's abbreviations and
 * descriptions (SpaceX, MHI and the generic sequence all use the standard vocabulary: MECO, SES, SECO…).
 */
export function flightState(events: TimelineEvent[], idx: number, hasBoosters: boolean): FlightState {
  const seen = events.slice(0, Math.max(0, idx) + 1)
  const passed = (re: RegExp) => seen.some((e) => re.test(text(e)))
  const lastIdx = (re: RegExp) => seen.reduce((acc, e, i) => (re.test(text(e)) ? i : acc), -1)
  const lifted = passed(/liftoff|lift-off/i)
  const meco = passed(/\bMECO\b|main engine cut/i)
  const stage1Off = passed(/stage ?2 sep|stage sep|stage separation|staging|stage ?1 sep/i) || passed(/\bSES-?1\b|second engine start|second stage ignition/i)
  // WHY: closing boundary matters: without it "SECO" matches the word "second" in every description.
  const seco = lastIdx(/\bSECO(?:-\d)?\b/i)
  const ses = lastIdx(/\bSES-?\d\b|second engine start|second stage ignition/i)
  return {
    lifted,
    mainEngine: lifted && !meco && !stage1Off,
    // WHY: not every timeline names booster separation; boosters are always gone by MECO or staging.
    boostersOff: passed(/booster.*sep|side core|\bSRB/i) || (hasBoosters && (meco || stage1Off)),
    stage1Off,
    fairingOff: passed(/fairing/i) || seco >= 0,
    secondEngine: ses >= 0 && ses > seco,
    deployed: passed(/deploy|payload sep|spacecraft sep/i),
    landed: passed(/landing(?! burn)/i),
  }
}
