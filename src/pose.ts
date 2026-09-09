// What GSAP tweens for the launch sequence: a plain object of 0..1 fields, one per visual beat. The 3D stage is a
// pure function of it (render(pose)), so scrubbing backwards, live sync and reduced-motion seeks all draw the same frame.
// WHY: tweening numbers instead of meshes lets the timeline build before three.js has loaded, and lets bun test the beats.
import { gsap } from 'gsap'
import type { TimelineEvent } from './launches'
import { classifyEvent } from './sequence'

export type Pose = {
  /** timeline seconds; plume flicker and the Max-Q shiver read it so a scrubbed frame is deterministic */
  t: number
  throttle1: number
  throttle2: number
  throttleB: number
  /** clearing the pad: strongback swings back, pad glow fades (first 2.6 s after liftoff) */
  lift: number
  /** progress along the ascent arc, liftoff → last event, linear in flight ordinal */
  p: number
  /** sky to black, stars in; same span as p but eased out */
  alt: number
  shake: number
  boosterSep: number
  stageSep: number
  fairing: number
  deploy: number
}

export const POSE0: Pose = { t: 0, throttle1: 0, throttle2: 0, throttleB: 0, lift: 0, p: 0, alt: 0, shake: 0, boosterSep: 0, stageSep: 0, fairing: 0, deploy: 0 }

/**
 * One paused, looping timeline with a beat per event at its compressed time (`times`). Beats that a timeline may not
 * name are back-filled by rule: boosters are gone by MECO or staging, stage 1 by SES, the fairing by SECO or deploy.
 */
export function buildTimeline(events: TimelineEvent[], times: number[], pose: Pose, { hasBoosters, hasFairing }: { hasBoosters: boolean; hasFairing: boolean }): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 3, defaults: { ease: 'power2.inOut' } })
  const total = times[times.length - 1] ?? 0
  const liftoffIdx = events.findIndex((e) => classifyEvent(e) === 'liftoff')
  const tLift = liftoffIdx >= 0 ? times[liftoffIdx]! : 0
  const flight = Math.max(2, total - tLift)
  let lit = false
  let boostersGone = !hasBoosters
  let fairingGone = !hasFairing
  let stage1Gone = false
  const light = (t: number) => {
    if (lit) return
    lit = true
    tl.to(pose, { throttle1: 1, duration: 0.5, ease: 'power3.out' }, t)
    if (hasBoosters) tl.to(pose, { throttleB: 1, duration: 0.5, ease: 'power3.out' }, t)
  }
  const dropBoosters = (t: number) => {
    if (boostersGone) return
    boostersGone = true
    tl.to(pose, { throttleB: 0, duration: 0.3 }, t)
    tl.to(pose, { boosterSep: 1, duration: 2.2, ease: 'power2.in' }, t)
  }
  const dropStage1 = (t: number) => {
    if (stage1Gone) return
    stage1Gone = true
    dropBoosters(t)
    tl.to(pose, { throttle1: 0, duration: 0.2 }, t)
    tl.to(pose, { stageSep: 1, duration: 2.4, ease: 'power1.in' }, t)
  }
  const openFairing = (t: number) => {
    if (fairingGone) return
    fairingGone = true
    tl.to(pose, { fairing: 1, duration: 2.2, ease: 'power2.in' }, t)
  }
  events.forEach((e, i) => {
    const t = times[i]!
    switch (classifyEvent(e)) {
      case 'ignition':
        light(t)
        break
      case 'liftoff':
        light(t)
        tl.to(pose, { lift: 1, duration: 2.6, ease: 'power1.out' }, t)
        // WHY: `p` is linear because the profile's markers are spaced by flight ordinal and every flight step plays for
        // the same 2.4 s, so a linear p puts the vehicle on each marker exactly at its event. `alt` eases out so the
        // sky darkens early, where the change is visible.
        tl.to(pose, { p: 1, duration: flight, ease: 'none' }, t)
        tl.to(pose, { alt: 1, duration: flight, ease: 'power1.out' }, t)
        break
      case 'maxq':
        // WHY: a shiver at maximum dynamic pressure is the one physical thing this beat can show.
        tl.to(pose, { shake: 1, duration: 0.05, yoyo: true, repeat: 11, ease: 'none' }, t)
        break
      case 'boosterSep':
        dropBoosters(t)
        break
      case 'meco':
        dropBoosters(t) // boosters are always gone by MECO
        tl.to(pose, { throttle1: 0, duration: 0.35, ease: 'power2.in' }, t)
        break
      case 'stageSep':
        dropStage1(t)
        break
      case 'ses':
        dropStage1(t - 0.4) // staging always precedes second-engine start
        tl.to(pose, { throttle2: 1, duration: 0.5, ease: 'power3.out' }, t)
        break
      case 'seco':
        tl.to(pose, { throttle2: 0, duration: 0.35, ease: 'power2.in' }, t)
        openFairing(t) // the fairing is always gone by orbit
        break
      case 'fairing':
        openFairing(t)
        break
      case 'deploy':
        openFairing(t - 1)
        tl.to(pose, { deploy: 1, duration: 2.4, ease: 'power1.out' }, t)
        break
      default:
        break
    }
  })
  return tl
}
