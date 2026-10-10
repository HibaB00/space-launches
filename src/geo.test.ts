import { describe, expect, test } from 'bun:test'
import land from 'world-atlas/land-110m.json'
import { coastlineSegments, compass, destination, graticuleSegments, inclinationFor, isLit, latLonToVec3, launchAzimuth, length, subsolarPoint, terminatorSegments, trackSegments, type Topology } from './geo'

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
const CAPE = { lat: 28.56, lon: -80.58 }

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

describe('sun and terminator', () => {
  test('subsolar point: on the Tropic of Cancer at the June solstice, near Greenwich at 12:00 UTC', () => {
    const s = subsolarPoint(Date.UTC(2026, 5, 21, 12, 0, 0))
    expect(s.lat).toBeCloseTo(23.4, 0)
    expect(Math.abs(s.lon)).toBeLessThan(4) // equation of time is a few minutes in June
    expect(subsolarPoint(Date.UTC(2026, 11, 21, 0, 0, 0)).lat).toBeCloseTo(-23.4, 0)
    expect(Math.abs(subsolarPoint(Date.UTC(2026, 2, 20, 0, 0, 0)).lon)).toBeGreaterThan(170) // midnight UTC: sun over the Pacific
  })
  test('terminator points are 90° from the sun; lit/dark split', () => {
    const seg = terminatorSegments(10, 20, 1, 36)
    const s = latLonToVec3(10, 20)
    for (let i = 0; i < seg.length; i += 3) expect(Math.abs(seg[i]! * s[0] + seg[i + 1]! * s[1] + seg[i + 2]! * s[2])).toBeLessThan(1e-6)
    expect(isLit(10, 20, 10, 20)).toBe(true)
    expect(isLit(-10, -160, 10, 20)).toBe(false)
  })
})

describe('launch azimuth', () => {
  test('ISS from the Cape heads north-east; SSO from Vandenberg heads south; due east when the orbit is at pad latitude', () => {
    expect(launchAzimuth(28.5, 51.6)).toBeCloseTo(45, 0)
    expect(compass(launchAzimuth(28.5, 51.6))).toBe('NE')
    const vafb = launchAzimuth(34.7, inclinationFor('SSO', 34.7))
    expect(vafb).toBeGreaterThan(180)
    expect(vafb).toBeLessThan(200)
    expect(compass(vafb)).toBe('S')
    expect(launchAzimuth(28.5, 28.5)).toBeCloseTo(90, 5)
    expect(inclinationFor('LEO', 46)).toBe(46) // Baikonur can't go lower than its own latitude
    expect(inclinationFor('PO', 5)).toBe(90)
  })
  test('destination: 90° due east from the equator lands on the equator 90° east; the track leaves the pad', () => {
    const d = destination(0, 0, 90, 90)
    expect(d.lat).toBeCloseTo(0, 5)
    expect(d.lon).toBeCloseTo(90, 5)
    const t = trackSegments(28.5, -80.6, 45, 14, 1, 4)
    expect(t).toHaveLength(24)
    expect(Math.hypot(t[0]! - t[21]!, t[1]! - t[22]!, t[2]! - t[23]!)).toBeGreaterThan(0.2)
  })
})
