// The one imperative island: Three.js owns this <canvas>. React only passes props in; effects translate them
// into scene changes. Loaded lazily (bundle-dynamic-imports) so the page renders before ~150 KB of Three.js arrives.
import { memo, useEffect, useRef } from 'react'
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import land from 'world-atlas/land-110m.json'
import { coastlineSegments, graticuleSegments, latLonToVec3, type Topology } from './geo'

export type GlobePad = { id: string; lat: number; lon: number }

type Props = {
  pads: GlobePad[]
  focusId: string | null
  className?: string
}

// Built once per page load: the coastlines and grid never change.
const COAST = coastlineSegments(land as unknown as Topology, 1.002)
const GRID = graticuleSegments(15, 1.0, 3)
// WHY: FOV 30° and radius 1: at 4.4 the sphere subtends ~26°, so the whole globe fits with a small margin.
const CAMERA_DISTANCE = 4.4
// WHY: CSS can't pause WebGL; the component has to read the media query itself and skip its own motion.
const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

type Rig = {
  renderer: WebGLRenderer
  camera: PerspectiveCamera
  scene: Scene
  controls: OrbitControls
  padsGeometry: BufferGeometry
  marker: Mesh<SphereGeometry, MeshBasicMaterial>
  ring: Mesh
  targetPos: Vector3 | null
}

function lineSegments(arr: Float32Array, color: number, opacity: number) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(arr, 3))
  return new LineSegments(geometry, new LineBasicMaterial({ color, transparent: opacity < 1, opacity }))
}

function disposeObject(obj: Mesh | LineSegments | Points) {
  obj.geometry.dispose()
  const m = obj.material
  if (Array.isArray(m)) m.forEach((x) => x.dispose())
  else m.dispose()
}

export const Globe = memo(function Globe({ pads, focusId, className }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const rig = useRef<Rig | null>(null)

  // Mount: build the scene once. Everything below reads/writes through `rig`.
  useEffect(() => {
    const el = host.current
    if (!el) return
    const renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(30, 1, 0.1, 100)
    camera.position.set(0, 0.6, CAMERA_DISTANCE)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = false
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.6

    // WHY: a solid sphere just under the lines hides the far hemisphere. Without it the back-side coastlines
    // show through and the globe reads as a tangle instead of a planet.
    const occluder = new Mesh(new SphereGeometry(0.995, 48, 32), new MeshBasicMaterial({ color: 0x0d0d0d }))
    const grid = lineSegments(GRID, 0x2b2b2b, 1)
    const coast = lineSegments(COAST, 0xd4d4d4, 0.9)

    const padsGeometry = new BufferGeometry()
    padsGeometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(0), 3))
    const padPoints = new Points(padsGeometry, new PointsMaterial({ color: 0xb8c4cc, size: 0.04, sizeAttenuation: true }))

    const marker = new Mesh(new SphereGeometry(0.02, 12, 8), new MeshBasicMaterial({ color: 0xa8d8f0, transparent: true }))
    const ring = new Mesh(new RingGeometry(0.05, 0.058, 32), new MeshBasicMaterial({ color: 0xa8d8f0, side: DoubleSide, transparent: true, opacity: 0.9 }))
    marker.visible = ring.visible = false

    scene.add(occluder, grid, coast, padPoints, marker, ring)
    const r: Rig = { renderer, camera, scene, controls, padsGeometry, marker, ring, targetPos: null }
    rig.current = r

    const resize = () => {
      const w = el.clientWidth || 1
      const h = el.clientHeight || w
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(el)

    let raf = 0
    let frame = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      frame++
      if (r.targetPos) {
        camera.position.lerp(r.targetPos, 0.06)
        if (camera.position.distanceTo(r.targetPos) < 0.002) r.targetPos = null
      }
      controls.update()
      if (!REDUCED_MOTION) marker.material.opacity = 0.55 + 0.45 * Math.sin(frame / 8)
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      controls.dispose()
      for (const o of [occluder, grid, coast, padPoints, marker, ring]) disposeObject(o)
      renderer.dispose()
      el.removeChild(renderer.domElement)
      rig.current = null
    }
  }, [])

  // Pads → point cloud.
  useEffect(() => {
    const r = rig.current
    if (!r) return
    const arr = new Float32Array(pads.length * 3)
    pads.forEach((p, i) => arr.set(latLonToVec3(p.lat, p.lon, 1.005), i * 3))
    r.padsGeometry.setAttribute('position', new Float32BufferAttribute(arr, 3))
    r.padsGeometry.computeBoundingSphere()
  }, [pads])

  // Focus → marker + camera target. WHY (rerender-dependencies): keyed on the id string, not on `now`,
  // so the one-second clock never reaches this component.
  useEffect(() => {
    const r = rig.current
    if (!r) return
    const pad = pads.find((p) => p.id === focusId)
    if (!pad) {
      r.marker.visible = r.ring.visible = false
      return
    }
    const v = new Vector3(...latLonToVec3(pad.lat, pad.lon, 1.006))
    r.marker.position.copy(v)
    r.ring.position.copy(v)
    r.ring.lookAt(v.clone().multiplyScalar(2))
    r.marker.visible = r.ring.visible = true
    // Look at the pad from slightly north of it so the horizon reads as a horizon.
    r.targetPos = v.clone().normalize().add(new Vector3(0, 0.25, 0)).normalize().multiplyScalar(CAMERA_DISTANCE)
  }, [pads, focusId])

  return <div ref={host} role="img" aria-label="Globe showing launch sites" className={`${className ?? ''} [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full`} />
})
