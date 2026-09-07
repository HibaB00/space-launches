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
