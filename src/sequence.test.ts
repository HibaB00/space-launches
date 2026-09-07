import { describe, expect, test } from 'bun:test'
import fixture from './fixtures/upcoming.json'
import { GENERIC_TIMELINE, toLaunch, type LL2Launch } from './launches'
import { classifyEvent, clockAt, eventTimes, flightState, ordinalAt, ordinalOfTime, segmentDuration, timeOfOrdinal } from './sequence'

const launches = (fixture.results as unknown as LL2Launch[]).map(toLaunch)
const f9 = launches.find((l) => l.name.includes('USSF-153'))!.timeline
const at = (abbrev: string) => f9.findIndex((e) => e.abbrev === abbrev)

describe('ordinalAt / clockAt', () => {
  test('null before the sequence, interpolated inside, capped after', () => {
    expect(ordinalAt(f9, -5000)).toBeNull()
    expect(ordinalAt(f9, -2280)).toBe(0) // GO for Prop Load
    const liftoff = at('Liftoff')
    expect(ordinalAt(f9, 0)).toBe(liftoff)
    const maxQ = f9[liftoff + 1]!
    expect(ordinalAt(f9, maxQ.offsetSec / 2)).toBeCloseTo(liftoff + 0.5, 6)
    expect(ordinalAt(f9, 99_999)).toBeNull()
    expect(ordinalAt(f9, f9[f9.length - 1]!.offsetSec + 1)).toBe(f9.length - 1)
  })
  test('clock is the inverse of ordinal', () => {
    for (const t of [-2000, -60, 0, 30, 146, 500]) expect(clockAt(f9, ordinalAt(f9, t)!)).toBeCloseTo(t, 6)
    expect(clockAt(GENERIC_TIMELINE, 0)).toBe(0)
    expect(clockAt(GENERIC_TIMELINE, GENERIC_TIMELINE.length - 1)).toBe(1200)
  })
  test('countdown steps play faster than flight steps', () => {
    expect(segmentDuration(f9, 0)).toBe(0.8)
    expect(segmentDuration(f9, at('Liftoff'))).toBe(2.4)
  })
})

describe('flightState', () => {
  test('on the pad nothing has happened', () => {
    const s = flightState(f9, at('GO for Launch'), false)
    expect(s).toMatchObject({ lifted: false, mainEngine: false, stage1Off: false, fairingOff: false, deployed: false })
  })
  test('walks the Falcon 9 sequence', () => {
    expect(flightState(f9, at('Liftoff'), false)).toMatchObject({ lifted: true, mainEngine: true, stage1Off: false })
    expect(flightState(f9, at('MECO'), false)).toMatchObject({ mainEngine: false, stage1Off: false })
    expect(flightState(f9, at('Stage 2 Separation'), false)).toMatchObject({ stage1Off: true, secondEngine: false })
    expect(flightState(f9, at('SES-1'), false)).toMatchObject({ secondEngine: true, fairingOff: false })
    expect(flightState(f9, at('Fairing Separation'), false)).toMatchObject({ fairingOff: true })
    expect(flightState(f9, at('Stage 1 Landing Burn'), false).landed).toBe(false)
    expect(flightState(f9, at('Stage 1 Landing'), false).landed).toBe(true)
  })
  test('boosters leave at their own event, or by MECO when the timeline has none', () => {
    const generic = GENERIC_TIMELINE
    const meco = generic.findIndex((e) => e.abbrev === 'MECO')
    expect(flightState(generic, meco - 1, true).boostersOff).toBe(false)
    expect(flightState(generic, meco, true).boostersOff).toBe(true)
    expect(flightState(generic, meco, false).boostersOff).toBe(false)
    const h3 = launches.find((l) => l.name.includes('MMX'))!.timeline
    const boosterSep = h3.findIndex((e) => /Boosters Separation/i.test(e.abbrev))
    expect(flightState(h3, boosterSep, true)).toMatchObject({ boostersOff: true, stage1Off: false })
  })
  test('second engine restarts: SES-2 after SECO-1 turns the engine back on', () => {
    const h3 = launches.find((l) => l.name.includes('MMX'))!.timeline
    const i = (a: string) => h3.findIndex((e) => e.abbrev === a)
    expect(flightState(h3, i('SECO-1'), true).secondEngine).toBe(false)
    expect(flightState(h3, i('SES-2'), true).secondEngine).toBe(true)
    expect(flightState(h3, i('SECO-2'), true).secondEngine).toBe(false)
    expect(flightState(h3, i('Payload Separation'), true).deployed).toBe(true)
  })
})

describe('classifyEvent / eventTimes', () => {
  test('classifies the standard vocabulary, landing burns included', () => {
    const kinds = f9.map((e) => classifyEvent(e))
    expect(kinds[f9.findIndex((e) => e.abbrev === 'Ignition')]).toBe('ignition')
    expect(kinds[f9.findIndex((e) => e.abbrev === 'Liftoff')]).toBe('liftoff')
    expect(kinds[f9.findIndex((e) => e.abbrev === 'Max-Q')]).toBe('maxq')
    expect(kinds[f9.findIndex((e) => e.abbrev === 'MECO')]).toBe('meco')
    expect(kinds[f9.findIndex((e) => e.abbrev === 'Stage 2 Separation')]).toBe('stageSep')
    expect(kinds[f9.findIndex((e) => e.abbrev === 'SES-1')]).toBe('ses')
    expect(kinds[f9.findIndex((e) => e.abbrev === 'Fairing Separation')]).toBe('fairing')
    expect(kinds[f9.findIndex((e) => e.abbrev === 'Stage 1 Landing Burn')]).toBe('landing')
    expect(kinds[f9.findIndex((e) => e.abbrev === 'GO for Launch')]).toBe('other')
    const h3 = launches.find((l) => l.name.includes('MMX'))!.timeline
    expect(classifyEvent(h3.find((e) => /Boosters Separation/.test(e.abbrev))!)).toBe('boosterSep')
    expect(classifyEvent(h3.find((e) => e.abbrev === 'SECO-2')!)).toBe('seco')
    expect(classifyEvent(h3.find((e) => e.abbrev === 'Payload Separation')!)).toBe('deploy')
  })
  test('event times accumulate segment durations and invert cleanly', () => {
    const times = eventTimes(f9)
    expect(times[0]).toBe(0)
    expect(times[1]).toBe(0.8)
    const liftoff = f9.findIndex((e) => e.abbrev === 'Liftoff')
    expect(times[liftoff + 1]! - times[liftoff]!).toBeCloseTo(2.4, 9)
    for (const o of [0, 0.5, 3.25, f9.length - 1]) expect(ordinalOfTime(times, times[Math.floor(o)]! + (o % 1) * (times[Math.floor(o) + 1]! - times[Math.floor(o)]!) || 0)).toBeCloseTo(o, 6)
    expect(ordinalOfTime(times, 9999)).toBe(f9.length - 1)
    for (const o of [0, 1.5, 7.25, f9.length - 1]) expect(ordinalOfTime(times, timeOfOrdinal(times, o))).toBeCloseTo(o, 6)
  })
})
