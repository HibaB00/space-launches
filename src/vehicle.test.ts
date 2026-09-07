import { describe, expect, test } from 'bun:test'
import fixture from './fixtures/upcoming.json'
import { toLaunch, type LL2Launch, type Vehicle } from './launches'
import { compareToReference, HUMAN_M, inferBoosters, knownEngines, sceneLayout, schematicLayout } from './vehicle'

const launches = (fixture.results as unknown as LL2Launch[]).map(toLaunch)
const vehicle = (s: string) => launches.find((l) => l.name.includes(s))!.vehicle

describe('schematicLayout', () => {
  test('Falcon 9: two stages plus a fairing, filling the drawing height', () => {
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
    expect(l.body.y).toBeCloseTo(28, 6) // fills the drawing top to ground
    expect(l.boosters).toEqual([]) // the core is the body, not a strap-on
  })
  test('a crewed flight ends in a capsule named after its configuration', () => {
    const l = schematicLayout(vehicle('Crew-13'))!
    const nose = l.segments[l.segments.length - 1]!
    expect(nose.kind).toBe('capsule')
    expect(nose.label).toBe('Crew Dragon 2')
  })
  test('small rockets fill the same height, with a proportionally bigger human beside them', () => {
    const electron = schematicLayout(vehicle('LOXSAT'))!
    const f9 = schematicLayout(vehicle('USSF-153'))!
    expect(electron.body.h).toBeCloseTo(f9.body.h, 6)
    expect(electron.human.h).toBeGreaterThan(f9.human.h * 3)
    expect(electron.body.w).toBeGreaterThanOrEqual(10) // minimum drawable width
  })
  test('compares heights to a Falcon 9 in words', () => {
    expect(compareToReference(70)).toBe('about as tall as a Falcon 9')
    expect(compareToReference(18)).toBe('about ¼ the height of a Falcon 9')
    expect(compareToReference(124.4)).toBe('1.8× the height of a Falcon 9')
    expect(compareToReference(46.3)).toBe('about ⅔ the height of a Falcon 9')
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

describe('inferBoosters / knownEngines', () => {
  const v = (name: string, boosters: Vehicle['boosters'] = []) => ({ name, boosters })
  test('reads the configuration name when LL2 has no strap-ons', () => {
    expect(inferBoosters(v('H3-24'))).toMatchObject({ count: 4, kind: 'solid', name: 'SRB-3 solid booster', source: 'name' })
    expect(inferBoosters(v('H3-30'))).toMatchObject({ count: 0, source: 'none' })
    expect(inferBoosters(v('Ariane 64 Block 2'))).toMatchObject({ count: 4, kind: 'solid' })
    expect(inferBoosters(v('Vulcan VC6L'))).toMatchObject({ count: 6, kind: 'solid' })
    expect(inferBoosters(v('Atlas V 551'))).toMatchObject({ count: 5 })
    expect(inferBoosters(v('Soyuz 2.1b'))).toMatchObject({ count: 4, kind: 'liquid' })
    expect(inferBoosters(v('Falcon Heavy'))).toMatchObject({ count: 2, kind: 'core' })
    expect(inferBoosters(v('Falcon 9 Block 5'))).toMatchObject({ count: 0 })
    expect(inferBoosters(v('Long March 8A'))).toMatchObject({ count: 0 })
    expect(inferBoosters(v('Long March 5B'))).toMatchObject({ count: 4 })
    expect(inferBoosters(v('Unknown Rocket'))).toMatchObject({ count: 0, source: 'none' })
  })
  test('the launch record wins over the name', () => {
    const rec = inferBoosters(v('H3-24', [{ type: 'Core', serial: 'x', flightNumber: 1, reused: false, landing: null }, { type: 'Strap-On Booster', serial: 'a', flightNumber: 1, reused: false, landing: null }, { type: 'Strap-On Booster', serial: 'b', flightNumber: 1, reused: false, landing: null }]))
    expect(rec).toMatchObject({ count: 2, source: 'll2' })
  })
  test('engines are reference knowledge by family', () => {
    expect(knownEngines('H3-24')).toBe('2 × LE-9')
    expect(knownEngines('Falcon 9 Block 5')).toBe('9 × Merlin 1D')
    expect(knownEngines('Long March 12A')).toBeNull()
  })
  test('schematic draws inferred strap-ons and family styles', () => {
    const h3 = schematicLayout(vehicle('MMX'))!
    expect(h3.boosters).toHaveLength(4)
    expect(h3.boosters.every((b) => b.kind === 'solid')).toBe(true)
    const soyuz = schematicLayout(vehicle('Progress MS-35'))!
    expect(soyuz.style).toBe('soyuz')
    expect(soyuz.boosters).toHaveLength(4)
    const starship = schematicLayout(vehicle('Flight 14'))!
    expect(starship.style).toBe('starship')
    expect(starship.segments.map((s) => s.kind)).toEqual(['stage', 'ship'])
    expect(schematicLayout(vehicle('USSF-153'))!.style).toBe('falcon')
  })
})

describe('sceneLayout', () => {
  test('hero rocket has a fixed hull width and a clamped slenderness', () => {
    const electron = sceneLayout(vehicle('LOXSAT'))
    const f9 = sceneLayout(vehicle('USSF-153'))
    const vega = sceneLayout(vehicle('Sentinel-3C'))
    expect(electron.body.w).toBe(30)
    expect(f9.body.h).toBeGreaterThan(electron.body.h)
    expect(electron.body.h).toBeGreaterThan(vega.body.h)
    expect(f9.body.h / f9.body.w).toBeLessThanOrEqual(9)
    expect(vega.body.h / vega.body.w).toBeGreaterThanOrEqual(6.5)
    expect(sceneLayout(vehicle('Long March 2D/YZ-3')).body.h).toBeGreaterThan(0) // no dimensions → default slenderness
    expect(sceneLayout(vehicle('MMX')).boosters).toHaveLength(4)
  })
})
