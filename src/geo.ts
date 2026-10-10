// Pure geometry for the globe. Plain number tuples, no Three.js, so it runs in bun test.
// Convention (Three.js is Y-up): north pole = +y, longitude 0 faces the default camera (+z), east = +x.

export type Vec3 = [number, number, number]
const D2R = Math.PI / 180

export function latLonToVec3(lat: number, lon: number, r = 1): Vec3 {
  const la = lat * D2R
  const lo = lon * D2R
  return [r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)]
}

export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2])

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

/**
 * Illustrative target inclination for an orbit abbreviation from a pad at `padLat`. WHY: a site can only reach
 * inclinations at or above its own latitude without a plane change, so "LEO" from Baikonur (46°N) means ≥46°
 * (the ISS flies 51.6° for exactly this reason); SSO is ~97.5° and polar 90° from anywhere.
 */
export function inclinationFor(orbitAbbrev: string, padLat: number): number {
  const a = orbitAbbrev.toUpperCase()
  if (a === 'SSO') return 97.5
  if (a === 'PO') return 90
  return Math.max(Math.abs(padLat), 28.5)
}

/**
 * Launch azimuth (compass heading at liftoff, degrees clockwise from north) that reaches `inclinationDeg` from `padLat`.
 * sin(az) = cos(i) / cos(lat); the northbound solution for prograde orbits, the southbound one (180° − az) for
 * polar and retrograde orbits, which is what Vandenberg, Jiuquan and Mahia fly for range safety over open water.
 */
export function launchAzimuth(padLat: number, inclinationDeg: number): number {
  const ratio = Math.max(-1, Math.min(1, Math.cos(inclinationDeg * D2R) / Math.cos(padLat * D2R)))
  const az = Math.asin(ratio) / D2R
  const heading = inclinationDeg >= 90 ? 180 - az : az
  return (heading + 360) % 360
}

/** Compass label for a heading: N, NE, E, … */
export function compass(headingDeg: number): string {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return names[Math.round((((headingDeg % 360) + 360) % 360) / 45) % 8]!
}

/** The point `distDeg` of arc along a great circle from (lat, lon) on `bearingDeg`. Standard destination formula. */
export function destination(lat: number, lon: number, bearingDeg: number, distDeg: number): { lat: number; lon: number } {
  const la = lat * D2R
  const lo = lon * D2R
  const br = bearingDeg * D2R
  const dd = distDeg * D2R
  const la2 = Math.asin(Math.sin(la) * Math.cos(dd) + Math.cos(la) * Math.sin(dd) * Math.cos(br))
  const lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(dd) * Math.cos(la), Math.cos(dd) - Math.sin(la) * Math.sin(la2))
  return { lat: la2 / D2R, lon: ((lo2 / D2R + 540) % 360) - 180 }
}

/** The first `distDeg` of a launch track from the pad as line segments on a sphere of radius r. */
export function trackSegments(lat: number, lon: number, bearingDeg: number, distDeg = 14, r = 1, steps = 16): Float32Array {
  const out = new Float32Array(steps * 6)
  let prev = latLonToVec3(lat, lon, r)
  for (let k = 1; k <= steps; k++) {
    const p = destination(lat, lon, bearingDeg, (distDeg * k) / steps)
    const v = latLonToVec3(p.lat, p.lon, r)
    out.set(prev, (k - 1) * 6)
    out.set(v, (k - 1) * 6 + 3)
    prev = v
  }
  return out
}
