import { describe, expect, test } from 'bun:test'
import fixture from './fixtures/upcoming.json'
import { GENERIC_TIMELINE, toLaunch, type LL2Launch, type TimelineEvent } from './launches'
import { buildTimeline, POSE0, type Pose } from './pose'
import { eventTimes } from './sequence'

const launches = (fixture.results as unknown as LL2Launch[]).map(toLaunch)
const f9 = launches.find((l) => l.name.includes('USSF-153'))!.timeline
const h3 = launches.find((l) => l.name.includes('MMX'))!.timeline

/** Seek the timeline to `abbrev` (+ `after` seconds) and return the pose there. */
function poseAt(events: TimelineEvent[], flags: { hasBoosters: boolean; hasFairing: boolean }) {
  const times = eventTimes(events)
  const pose: Pose = { ...POSE0 }
  const tl = buildTimeline(events, times, pose, flags)
  const at = (abbrev: string | RegExp, after = 0) => {
    const i = events.findIndex((e) => (typeof abbrev === 'string' ? e.abbrev === abbrev : abbrev.test(e.abbrev)))
    tl.time(times[i]! + after)
    return { ...pose }
  }
  return { at, tl, pose }
}

describe('buildTimeline', () => {
  test('Falcon 9: engines, staging, fairing, deploy, and a clean rewind', () => {
    const { at, tl, pose } = poseAt(f9, { hasBoosters: false, hasFairing: true })
    expect(at('GO for Launch')).toMatchObject({ throttle1: 0, lift: 0, p: 0 })
    expect(at('Liftoff', 2.6)).toMatchObject({ throttle1: 1, throttleB: 0 })
    expect(at('Liftoff', 2.6).lift).toBeCloseTo(1, 6)
    expect(at('MECO', 0.5)).toMatchObject({ throttle1: 0, stageSep: 0 })
    expect(at('SES-1', 2.0)).toMatchObject({ stageSep: 1, throttle2: 1, fairing: 0 }) // staging began 0.4 s before SES-1; the next beat is 2.4 s away
    expect(at('Fairing Separation', 2.5).fairing).toBe(1)
    const end = at('Stage 1 Landing')
    expect(end.p).toBeCloseTo(1, 6)
    expect(end.alt).toBeCloseTo(1, 6)
    tl.time(0)
    expect(pose).toMatchObject(POSE0) // GSAP hangs a _gsap record on the target; the fields are what matter
  })
  test('boosters leave at their own event (H3) or by MECO (generic)', () => {
    const h = poseAt(h3, { hasBoosters: true, hasFairing: true })
    expect(h.at(/Boosters Separation/i, 2.5)).toMatchObject({ boosterSep: 1, throttleB: 0, stageSep: 0 })
    const g = poseAt(GENERIC_TIMELINE, { hasBoosters: true, hasFairing: true })
    expect(g.at('MECO', -0.1).boosterSep).toBe(0)
    expect(g.at('MECO', 2.5).boosterSep).toBe(1)
    expect(poseAt(GENERIC_TIMELINE, { hasBoosters: false, hasFairing: true }).at('MECO', 2.5).boosterSep).toBe(0)
  })
  test('second engine restarts: SES-2 after SECO-1 relights; the fairing is gone by SECO even when never named', () => {
    const { at } = poseAt(h3, { hasBoosters: true, hasFairing: true })
    expect(at('SECO-1', 0.5).throttle2).toBe(0)
    expect(at('SES-2', 0.5).throttle2).toBe(1)
    expect(at('SECO-2', 0.5).throttle2).toBe(0)
    expect(at('Payload Separation', 2.5).deploy).toBe(1)
    const noFairing = GENERIC_TIMELINE.filter((e) => !/fairing/i.test(e.abbrev))
    expect(poseAt(noFairing, { hasBoosters: false, hasFairing: true }).at(/SECO/, 2.5).fairing).toBe(1)
  })
})
