// Pure geometry for the globe. Plain number tuples, no Three.js, so it runs in bun test.
// Convention (Three.js is Y-up): north pole = +y, longitude 0 faces the default camera (+z), east = +x.

export type Vec3 = [number, number, number]
const D2R = Math.PI / 180

export function latLonToVec3(lat: number, lon: number, r = 1): Vec3 {
  const la = lat * D2R
  const lo = lon * D2R
  return [r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)]
}

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2])
const normalize = (a: Vec3): Vec3 => scale(a, 1 / length(a))
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export type Topology = {
  transform?: { scale: [number, number]; translate: [number, number] }
  arcs: number[][][]
}

/**
 * Coastlines as line segments (x,y,z pairs) on a sphere of radius r.
 * WHY: every TopoJSON *arc* is already a coastline polyline, so we never need to assemble polygons
 * or pull in topojson-client. Quantized topologies store arcs delta-encoded; we integrate the deltas.
 */
export function coastlineSegments(topo: Topology, r = 1): Float32Array {
  const out: number[] = []
  const t = topo.transform
  for (const arc of topo.arcs) {
    let x = 0
    let y = 0
    let prev: Vec3 | null = null
    for (const [px, py] of arc) {
      let lon: number
      let lat: number
      if (t) {
        x += px
        y += py
        lon = x * t.scale[0] + t.translate[0]
        lat = y * t.scale[1] + t.translate[1]
      } else {
        lon = px
        lat = py
      }
      const p = latLonToVec3(lat, lon, r)
      if (prev) out.push(prev[0], prev[1], prev[2], p[0], p[1], p[2])
      prev = p
    }
  }
  return new Float32Array(out)
}

/** Lines of latitude and longitude every `stepDeg` degrees, as segments. */
export function graticuleSegments(stepDeg = 15, r = 1, resolutionDeg = 3): Float32Array {
  const out: number[] = []
  const push = (a: Vec3, b: Vec3) => out.push(a[0], a[1], a[2], b[0], b[1], b[2])
  for (let lat = -90 + stepDeg; lat < 90; lat += stepDeg) {
    for (let lon = -180; lon < 180; lon += resolutionDeg) push(latLonToVec3(lat, lon, r), latLonToVec3(lat, lon + resolutionDeg, r))
  }
  for (let lon = -180; lon < 180; lon += stepDeg) {
    for (let lat = -90; lat < 90; lat += resolutionDeg) push(latLonToVec3(lat, lon, r), latLonToVec3(lat + resolutionDeg, lon, r))
  }
  return new Float32Array(out)
}

/** Illustrative orbit shape per LL2 orbit abbreviation. Radii in Earth radii, compressed to fit the view (real GEO is 6.6 R). */
export type OrbitProfile = { inclinationDeg: number; perigee: number; apogee: number; escape: boolean }

export function orbitProfile(orbitAbbrev: string, padLat: number): OrbitProfile {
  const lat = Math.abs(padLat)
  // WHY: an orbit's inclination can never be lower than the launch site's latitude without an expensive plane
  // change. That single fact is why equatorial sites (Kourou, 5°N) are prized and why ISS flies at 51.6°, the
  // latitude of Baikonur's launch corridor.
  const atLeastLat = (typical: number) => Math.max(lat, typical)
  switch (orbitAbbrev) {
    case 'SSO':
      // WHY: sun-synchronous orbits are slightly retrograde (~97–98°) so the orbital plane precesses once a year.
      return { inclinationDeg: 97.5, perigee: 1.09, apogee: 1.09, escape: false }
    case 'PO':
      return { inclinationDeg: 90, perigee: 1.09, apogee: 1.09, escape: false }
    case 'MEO':
      return { inclinationDeg: atLeastLat(55), perigee: 1.35, apogee: 1.35, escape: false }
    case 'GTO':
      return { inclinationDeg: atLeastLat(0), perigee: 1.05, apogee: 1.9, escape: false }
    case 'GEO':
    case 'GSO':
      return { inclinationDeg: atLeastLat(0), perigee: 1.9, apogee: 1.9, escape: false }
    case 'TLI':
    case 'Moon':
    case 'Lunar':
    case 'Mars':
    case 'Helio':
    case 'Interplanetary':
      return { inclinationDeg: atLeastLat(28.5), perigee: 1.05, apogee: 1.05, escape: true }
    default:
      // LEO, Sub, N/A, unknown
      return { inclinationDeg: atLeastLat(45), perigee: 1.08, apogee: 1.08, escape: false }
  }
}

/** Unit vectors: pad position p, initial velocity direction v (in the local horizontal), orbit normal n. */
export type OrbitFrame = { p: Vec3; v: Vec3; n: Vec3 }

export function orbitFrame(padLat: number, padLon: number, inclinationDeg: number): OrbitFrame {
  const p = latLonToVec3(padLat, padLon)
  const east = normalize(cross([0, 1, 0], p))
  const north = normalize(cross(p, east))
  // The orbit normal n lies in the local horizontal plane (it must be ⟂ p) and makes angle i with the pole:
  // n = cosθ·north ± sinθ·east with cosθ = cos(i)/cos(lat). |cos(i)| > cos(lat) is impossible: clamped.
  const theta = Math.acos(clamp(Math.cos(inclinationDeg * D2R) / Math.cos(padLat * D2R), -1, 1))
  // WHY: sign picks the launch heading. Prograde flights climb north-east out of the pad (Cape → ISS);
  // retrograde/sun-synchronous flights head south (Vandenberg, Jiuquan, Mahia all launch SSO southward).
  const sign = inclinationDeg > 90 ? 1 : -1
  const n = normalize(add(scale(north, Math.cos(theta)), scale(east, sign * Math.sin(theta))))
  const v = normalize(cross(n, p))
  return { p, v, n }
}

const smoothstep = (t: number) => t * t * (3 - 2 * t)
const ASCENT_ANGLE = 30 * D2R

/**
 * Points along an illustrative ascent-and-orbit path: rise from the pad over 30° of downrange travel,
 * then one full orbit (an ellipse with perigee at the insertion point), or a departure leg for escape missions.
 * Returns flat xyz positions plus how many of them belong to the ascent (so it can be drawn brighter).
 */
export function trajectoryPoints(frame: OrbitFrame, profile: OrbitProfile, steps = 480): { positions: Float32Array; ascentCount: number } {
  const total = profile.escape ? ASCENT_ANGLE + 1.4 : ASCENT_ANGLE + 2 * Math.PI
  const a = (profile.perigee + profile.apogee) / 2
  const e = (profile.apogee - profile.perigee) / (profile.apogee + profile.perigee)
  const out = new Float32Array(steps * 3)
  let ascentCount = 0
  for (let i = 0; i < steps; i++) {
    const phi = (i / (steps - 1)) * total
    let r: number
    if (phi <= ASCENT_ANGLE) {
      r = 1 + (profile.perigee - 1) * smoothstep(phi / ASCENT_ANGLE)
      ascentCount = i + 1
    } else if (profile.escape) {
      const s = phi - ASCENT_ANGLE
      r = profile.perigee + 1.2 * s * s
    } else {
      const psi = phi - ASCENT_ANGLE
      r = (a * (1 - e * e)) / (1 + e * Math.cos(psi))
    }
    const dir = add(scale(frame.p, Math.cos(phi)), scale(frame.v, Math.sin(phi)))
    out[i * 3] = dir[0] * r
    out[i * 3 + 1] = dir[1] * r
    out[i * 3 + 2] = dir[2] * r
  }
  return { positions: out, ascentCount }
}
