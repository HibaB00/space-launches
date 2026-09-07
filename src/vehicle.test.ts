import { describe, expect, test } from 'bun:test'
import fixture from './fixtures/upcoming.json'
import { toLaunch, type LL2Launch } from './launches'
import { HUMAN_M, REFERENCE, schematicLayout } from './vehicle'

const launches = (fixture.results as unknown as LL2Launch[]).map(toLaunch)
const vehicle = (s: string) => launches.find((l) => l.name.includes(s))!.vehicle

describe('schematicLayout', () => {
  test('Falcon 9: two stages plus a fairing, to scale, no reference line against itself', () => {
    const v = vehicle('USSF-153')
    const l = schematicLayout(v)!
    expect(l).not.toBeNull()
    expect(l.segments.map((s) => s.kind)).toEqual(['stage', 'stage', 'fairing'])
    expect(l.segments.map((s) => s.label)).toEqual(['Stage 1', 'Stage 2', 'Fairing'])
    const sum = l.segments.reduce((a, s) => a + s.h, 0)
    expect(sum).toBeCloseTo(l.body.h, 6)
    expect(l.body.h).toBeCloseTo(70 * l.scale, 6)
    expect(l.body.w).toBeCloseTo(3.65 * l.scale, 6)
    expect(l.body.y + l.body.h).toBeCloseTo(l.ground, 6)
    expect(l.segments[0]!.y + l.segments[0]!.h).toBeCloseTo(l.ground, 6) // stage 1 sits on the ground
    expect(l.segments[2]!.y).toBeCloseTo(l.body.y, 6) // fairing reaches the top
    expect(l.human.h).toBeCloseTo(HUMAN_M * l.scale, 6)
    expect(l.reference).toBeNull()
    expect(l.boosters).toEqual([]) // the core is the body, not a strap-on
  })
  test('a crewed flight ends in a capsule named after its configuration', () => {
    const l = schematicLayout(vehicle('Crew-13'))!
    const nose = l.segments[l.segments.length - 1]!
    expect(nose.kind).toBe('capsule')
    expect(nose.label).toBe('Crew Dragon 2')
  })
  test('small rockets share the scale with the Falcon 9 reference line', () => {
    const electron = schematicLayout(vehicle('LOXSAT'))!
    expect(electron.reference).toMatchObject({ label: `${REFERENCE.label} · 70 m` })
    expect(electron.body.h).toBeCloseTo((18 / 70) * (electron.reference!.y - electron.ground) * -1, 6)
    expect(electron.body.w).toBeGreaterThanOrEqual(6) // minimum drawable width
  })
  test('a single-stage vehicle is a stage plus a nose', () => {
    const l = schematicLayout(vehicle('Themis'))!
    expect(l.segments.map((s) => s.kind)).toEqual(['stage', 'nose'])
  })
  test('missing dimensions mean no drawing', () => {
    expect(schematicLayout(vehicle('Long March 2D/YZ-3'))).toBeNull()
  })
  test('strap-on boosters alternate sides and stay clear of the core', () => {
    const v = { ...vehicle('USSF-153'), boosters: [{ type: 'Strap-On Booster', serial: 'L', flightNumber: null, reused: false, landing: null }, { type: 'Strap-On Booster', serial: 'R', flightNumber: null, reused: false, landing: null }] }
    const l = schematicLayout(v)!
    expect(l.boosters).toHaveLength(2)
    expect(l.boosters[0]!.x + l.boosters[0]!.w).toBeLessThanOrEqual(l.body.x)
    expect(l.boosters[1]!.x).toBeGreaterThanOrEqual(l.body.x + l.body.w)
  })
})
