// One-off generator: which points of a lat/lon grid fall on land? Writes src/land-dots.json for the globe.
// WHY: point-in-polygon over ~10k coastline vertices for ~30k grid points is far too slow to do in every
// visitor's browser, and the answer never changes. Precompute once, commit the ~40 KB result, draw as Points.
// Re-run with `bun run scripts/build-land-dots.ts` only if the land data or the spacing changes.
import { feature } from 'topojson-client'
import type { MultiPolygon, Polygon } from 'geojson'
import type { Topology } from 'topojson-specification'
import land from 'world-atlas/land-110m.json' with { type: 'json' }

const topo = land as unknown as Topology
// WHY: feature() returns a Feature for a single geometry and a FeatureCollection for a GeometryCollection;
// world-atlas has shipped both shapes over versions, so accept either.
const f = feature(topo, topo.objects.land!) as GeoJSON.Feature<MultiPolygon | Polygon> | GeoJSON.FeatureCollection<MultiPolygon | Polygon>
const geometries = f.type === 'FeatureCollection' ? f.features.map((x) => x.geometry) : [f.geometry]
const polygons = geometries.flatMap((g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []))
// Every ring (outer or hole) with its bounding box; even-odd counting over all rings handles holes for free.
const rings = polygons.flat().map((ring) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of ring as [number, number][]) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return { ring: ring as [number, number][], minX, minY, maxX, maxY }
})

function inLand(lon: number, lat: number): boolean {
  let inside = false
  for (const r of rings) {
    if (lon < r.minX || lon > r.maxX || lat < r.minY || lat > r.maxY) continue
    const pts = r.ring
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]!
      const [xj, yj] = pts[j]!
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

const STEP = 1.5
const points: number[] = []
for (let lat = -89.25; lat <= 89.25; lat += STEP) {
  // WHY: widen the longitude step toward the poles so dots stay roughly equal-area instead of bunching up.
  const lonStep = STEP / Math.max(0.15, Math.cos((lat * Math.PI) / 180))
  for (let lon = -180; lon < 180; lon += lonStep) {
    if (inLand(lon, lat)) points.push(Math.round(lat * 10) / 10, Math.round(lon * 10) / 10)
  }
}
const out = new URL('../src/land-dots.json', import.meta.url)
await Bun.write(out, JSON.stringify({ stepDeg: STEP, points }))
console.log(`${points.length / 2} land dots at ${STEP}° → ${out.pathname} (${(JSON.stringify(points).length / 1024).toFixed(0)} KB)`)
