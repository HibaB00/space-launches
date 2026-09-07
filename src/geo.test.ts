import { describe, expect, test } from 'bun:test'
import land from 'world-atlas/land-110m.json'
import {
  coastlineSegments,
  dot,
  graticuleSegments,
  latLonToVec3,
  length,
  orbitFrame,
  orbitProfile,
  trajectoryPoints,
  type Topology,
  type Vec3,
} from './geo'

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
const CAPE = { lat: 28.56, lon: -80.58 }
const VANDENBERG = { lat: 34.63, lon: -120.61 }

describe('latLonToVec3', () => {
  test('equator/prime meridian faces the camera, north pole is +y', () => {
    expect(latLonToVec3(0, 0)).toEqual([0, 0, 1])
    const pole = latLonToVec3(90, 0)
    expect(near(pole[0], 0) && near(pole[1], 1) && near(pole[2], 0)).toBe(true)
  })
  test('east is +x, west is -x; radius scales', () => {
    expect(latLonToVec3(0, 90)[0]).toBeCloseTo(1, 6)
    const cape = latLonToVec3(CAPE.lat, CAPE.lon, 2)
    expect(cape[0]).toBeLessThan(0)
    expect(cape[1]).toBeGreaterThan(0)
    expect(length(cape)).toBeCloseTo(2, 6)
  })
})

describe('coastlineSegments', () => {
  test('integrates delta-encoded quantized arcs', () => {
    const topo: Topology = {
      transform: { scale: [1, 1], translate: [0, 0] },
      arcs: [[[0, 0], [90, 0], [0, 90]]], // (0,0) → (90,0) → (90,90): two segments
    }
    const s = coastlineSegments(topo)
    expect(s).toHaveLength(12)
    expect(Array.from(s.slice(0, 3))).toEqual([0, 0, 1])
    expect(s[3]).toBeCloseTo(1, 6) // lon 90 → +x
    expect(s[10]).toBeCloseTo(1, 6) // lat 90 → +y
  })
  test('decodes the real world-atlas land file onto the unit sphere', () => {
    const s = coastlineSegments(land as unknown as Topology)
    expect(s.length / 6).toBeGreaterThan(4000)
    for (let i = 0; i < s.length; i += 3) expect(length([s[i], s[i + 1], s[i + 2]])).toBeCloseTo(1, 5)
  })
  test('graticule is non-empty and on the sphere', () => {
    const g = graticuleSegments(15, 1.001)
    expect(g.length % 6).toBe(0)
    expect(length([g[0], g[1], g[2]])).toBeCloseTo(1.001, 5)
  })
})

describe('orbitProfile', () => {
  test('inclination can never be below the pad latitude', () => {
    expect(orbitProfile('GTO', CAPE.lat).inclinationDeg).toBeCloseTo(CAPE.lat, 6)
    expect(orbitProfile('LEO', 5.2).inclinationDeg).toBe(45)
    expect(orbitProfile('LEO', 62.9).inclinationDeg).toBe(62.9)
  })
  test('sun-synchronous is retrograde, escape missions are flagged', () => {
    expect(orbitProfile('SSO', VANDENBERG.lat).inclinationDeg).toBeGreaterThan(90)
    expect(orbitProfile('Mars', CAPE.lat).escape).toBe(true)
    expect(orbitProfile('GTO', 0).apogee).toBeGreaterThan(orbitProfile('GTO', 0).perigee)
  })
})

describe('orbitFrame', () => {
  const east = (lat: number, lon: number): Vec3 => {
    const a = latLonToVec3(lat, lon + 0.01)
    const b = latLonToVec3(lat, lon - 0.01)
    const d: Vec3 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
    const l = length(d)
    return [d[0] / l, d[1] / l, d[2] / l]
  }
  test('is orthonormal and has the requested inclination', () => {
    const f = orbitFrame(CAPE.lat, CAPE.lon, 51.6)
    expect(length(f.p)).toBeCloseTo(1, 6)
    expect(length(f.v)).toBeCloseTo(1, 6)
    expect(length(f.n)).toBeCloseTo(1, 6)
    expect(dot(f.p, f.v)).toBeCloseTo(0, 6)
    expect(dot(f.p, f.n)).toBeCloseTo(0, 6)
    expect(dot(f.v, f.n)).toBeCloseTo(0, 6)
    expect(dot(f.n, [0, 1, 0])).toBeCloseTo(Math.cos((51.6 * Math.PI) / 180), 6)
  })
  test('ISS-bound flights from the Cape head north-east; SSO flights from Vandenberg head south-west', () => {
    const iss = orbitFrame(CAPE.lat, CAPE.lon, 51.6)
    expect(dot(iss.v, east(CAPE.lat, CAPE.lon))).toBeGreaterThan(0)
    expect(iss.v[1]).toBeGreaterThan(0) // gaining latitude (+y)
    const sso = orbitFrame(VANDENBERG.lat, VANDENBERG.lon, 97.5)
    expect(dot(sso.v, east(VANDENBERG.lat, VANDENBERG.lon))).toBeLessThan(0)
    expect(sso.v[1]).toBeLessThan(0)
  })
  test('clamps an impossible inclination up to the pad latitude (due east)', () => {
    const f = orbitFrame(CAPE.lat, CAPE.lon, 0)
    expect(dot(f.v, east(CAPE.lat, CAPE.lon))).toBeCloseTo(1, 4)
  })
})

describe('trajectoryPoints', () => {
  test('starts at the pad, climbs to the orbit, stays in the orbital plane', () => {
    const f = orbitFrame(CAPE.lat, CAPE.lon, 51.6)
    const prof = orbitProfile('LEO', CAPE.lat)
    const { positions, ascentCount } = trajectoryPoints(f, prof, 200)
    expect(positions).toHaveLength(600)
    expect(ascentCount).toBeGreaterThan(5)
    expect(ascentCount).toBeLessThan(40)
    expect(length([positions[0], positions[1], positions[2]])).toBeCloseTo(1, 6)
    const last: Vec3 = [positions[597], positions[598], positions[599]]
    expect(length(last)).toBeCloseTo(prof.perigee, 4)
    for (let i = 0; i < positions.length; i += 3) {
      expect(dot([positions[i], positions[i + 1], positions[i + 2]], f.n)).toBeCloseTo(0, 5)
    }
  })
  test('GTO reaches its apogee; escape paths leave the sphere', () => {
    const f = orbitFrame(5.2, -52.8, 6)
    const gto = trajectoryPoints(f, orbitProfile('GTO', 5.2), 720)
    let max = 0
    for (let i = 0; i < gto.positions.length; i += 3) max = Math.max(max, length([gto.positions[i], gto.positions[i + 1], gto.positions[i + 2]]))
    expect(max).toBeCloseTo(1.9, 2)
    const esc = trajectoryPoints(f, orbitProfile('Mars', 5.2), 100)
    const n = esc.positions.length
    expect(length([esc.positions[n - 3], esc.positions[n - 2], esc.positions[n - 1]])).toBeGreaterThan(2)
  })
})
