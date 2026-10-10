import { describe, expect, test } from 'bun:test'
import fixture from './fixtures/upcoming.json'
import { GENERIC_TIMELINE, toLaunch, type LL2Launch } from './launches'
import { arc, ascentIndices, ascentU, collapseBurns, configAt, descentIndices, descentStart, isReturnEvent, overlaps, pathU, placeLabels, quadratic } from './profile'

const launches = (fixture.results as unknown as LL2Launch[]).map(toLaunch)
const f9 = launches.find((l) => l.name.includes('USSF-153'))!.timeline
const at = (abbrev: string) => f9.findIndex((e) => e.abbrev === abbrev)

describe('arc', () => {
  test('ends meet the control polygon, distance is monotone, heading follows the tangent', () => {
    const a = arc({ x: 0, y: 100 }, { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 })
    expect(a.at(0)).toMatchObject({ x: 0, y: 100 })
    expect(a.at(1).x).toBeCloseTo(100, 6)
    expect(a.at(1).y).toBeCloseTo(0, 6)
    expect(a.at(0).angle).toBeCloseTo(0, 0) // straight up off the pad
    expect(a.at(1).angle).toBeCloseTo(90, 0) // level, heading right
    let last = 0
    for (let u = 0; u <= 1; u += 0.05) {
      const p = a.at(u)
      const d = Math.hypot(p.x, p.y - 100)
      expect(d).toBeGreaterThanOrEqual(last - 1e-9)
      last = d
    }
    expect(a.length).toBeGreaterThan(141) // longer than the chord
    expect(quadratic({ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }).at(0.5).y).toBeCloseTo(50, 6)
  })
})

describe('configAt', () => {
  test('Falcon 9 walks through its configurations', () => {
    const flags = { hasBoosters: false, hasFairing: true }
    expect(configAt(f9, at('GO for Launch'), flags)).toMatchObject({ stage1: true, fairing: true, engine1: false })
    expect(configAt(f9, at('Liftoff'), flags)).toMatchObject({ stage1: true, engine1: true, return: false })
    expect(configAt(f9, at('MECO'), flags)).toMatchObject({ stage1: true, engine1: false })
    expect(configAt(f9, at('Stage 2 Separation'), flags)).toMatchObject({ stage1: false, engine2: false })
    expect(configAt(f9, at('SES-1'), flags)).toMatchObject({ stage1: false, engine2: true, fairing: true })
    expect(configAt(f9, at('Fairing Separation'), flags).fairing).toBe(false)
    expect(configAt(f9, at('Stage 1 Landing Burn'), flags)).toMatchObject({ return: true, lit: true })
    expect(configAt(f9, at('Stage 1 Landing'), flags)).toMatchObject({ return: true, lit: false })
    expect(f9.filter((_, i) => isReturnEvent(f9, i)).map((e) => e.abbrev)).toEqual(['Entry Burn Startup', 'Entry Burn Shutdown', 'Stage 1 Landing Burn', 'Stage 1 Landing'])
  })
  test('boosters are gone by MECO on the generic timeline; the fairing by SECO; the payload deployed at the end', () => {
    const flags = { hasBoosters: true, hasFairing: true }
    const i = (a: string) => GENERIC_TIMELINE.findIndex((e) => e.abbrev === a)
    expect(configAt(GENERIC_TIMELINE, i('MECO') - 1, flags).boosters).toBe(true)
    expect(configAt(GENERIC_TIMELINE, i('MECO'), flags).boosters).toBe(false)
    expect(configAt(GENERIC_TIMELINE, i('SECO-1'), flags)).toMatchObject({ fairing: false, engine2: false })
    expect(configAt(GENERIC_TIMELINE, GENERIC_TIMELINE.length - 1, flags).deployed).toBe(true)
    expect(GENERIC_TIMELINE.some((_, i) => isReturnEvent(GENERIC_TIMELINE, i))).toBe(false)
  })
})

describe('placeLabels', () => {
  test('neighbours never overlap, reserved space is respected, and the frame edge pushes labels the other way', () => {
    const frame = { w: 1000, h: 420 }
    const readout = { x: 0, y: 0, w: 400, h: 220 }
    const m = (x: number, y: number) => ({ x, y, w: 120, h: 24 })
    const placed = placeLabels([m(150, 300), m(200, 280), m(250, 260), m(500, 150), m(520, 140)], frame, [readout])
    const boxes = placed.map((p) => p.box)
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlaps(boxes[i]!, boxes[j]!)).toBe(false)
    for (const b of boxes) expect(overlaps(b, readout)).toBe(false)
    expect(placed[0]!.anchor).toBe('below')
    expect(placed[1]!.anchor).not.toBe('below') // the first label is already there
    // A marker near the top cannot label above: it goes below.
    expect(placeLabels([m(500, 30)], frame, [])[0]!.anchor).toBe('below')
    expect(placeLabels([m(500, 400)], frame, [])[0]!.anchor).toBe('above')
    // Preference order is honoured when it fits.
    expect(placeLabels([m(500, 200, ), { ...m(500, 200), prefer: ['right'] }], frame, [])[1]!.anchor).toBe('right')
  })
})

describe('ascentU / collapseBurns', () => {
  test('return events take time but do not move along the ascent; burn pairs become one marker', () => {
    const liftoff = at('Liftoff')
    expect(ascentU(f9, liftoff, liftoff)).toBe(0)
    expect(ascentU(f9, liftoff, f9.length - 1)).toBe(1)
    const lastAscent = ascentIndices(f9, liftoff).at(-1)!
    expect(ascentU(f9, liftoff, lastAscent)).toBe(1) // the last ascent event sits at the end of the arc
    const uMeco = ascentU(f9, liftoff, at('MECO'))
    expect(uMeco).toBeGreaterThan(0)
    expect(ascentU(f9, liftoff, at('MECO') + 0.5)).toBeGreaterThan(uMeco)
    const groups = collapseBurns(f9, liftoff)
    const names = groups.map((g) => g.e.abbrev)
    expect(names).toContain('Entry Burn')
    // A burn whose shutdown comes after another event (Falcon 9's boostback brackets the fairing separation) still collapses.
    const split = [
      { abbrev: 'Boostback Burn Startup', description: '', offsetSec: 150 },
      { abbrev: 'Fairing Separation', description: '', offsetSec: 180 },
      { abbrev: 'Boostback Burn Shutdown', description: '', offsetSec: 200 },
    ]
    expect(collapseBurns(split).map((g) => g.e.abbrev)).toEqual(['Boostback Burn', 'Fairing Separation'])
    expect(names.some((n) => /shutdown/i.test(n))).toBe(false)
    expect(groups.find((g) => g.e.abbrev === 'Entry Burn')!.until!.abbrev).toMatch(/shutdown/i)
    expect(groups.length).toBeLessThan(f9.length - liftoff)
  })
})

describe('descent', () => {
  test('Falcon 9 has no descent; a Starship-style timeline puts the ship events after SECO on the descent leg', () => {
    expect(descentStart(f9)).toBe(-1)
    const ship = [
      ...GENERIC_TIMELINE.filter((e) => !/deploy|SECO/i.test(e.abbrev)),
      { abbrev: 'Stage 1 Landing', description: 'Booster lands', offsetSec: 420 },
      ...GENERIC_TIMELINE.filter((e) => /SECO/i.test(e.abbrev)),
      { abbrev: 'Deorbit Burn', description: 'Ship slows for entry', offsetSec: 3_000 },
      { abbrev: 'Atmospheric Entry', description: '', offsetSec: 3_500 },
      { abbrev: 'Starship Landing', description: 'Splashdown', offsetSec: 3_900 },
    ]
    const d = descentStart(ship)
    expect(ship[d]!.abbrev).toBe('Deorbit Burn')
    expect(descentIndices(ship).map((i) => ship[i]!.abbrev)).toEqual(['Deorbit Burn', 'Atmospheric Entry', 'Starship Landing'])
    expect(isReturnEvent(ship, ship.length - 1)).toBe(false) // the ship's landing is after SECO: not the booster's
    expect(isReturnEvent(ship, ship.findIndex((e) => e.abbrev === 'Stage 1 Landing'))).toBe(true) // before SECO: the booster's
    expect(ascentIndices(ship, 0).some((i) => i >= d)).toBe(false)
    expect(pathU([2, 4, 8], 2)).toBe(0)
    expect(pathU([2, 4, 8], 4)).toBeCloseTo(0.5, 9)
    expect(pathU([2, 4, 8], 6)).toBeCloseTo(0.75, 9)
    expect(pathU([2, 4, 8], 9)).toBe(1)
  })
})
