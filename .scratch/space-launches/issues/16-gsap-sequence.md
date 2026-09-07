# 16 — Launch sequence on GSAP

Status: resolved
Blocked by: 15

## Delivers

The sequence animation rebuilt on GSAP 3.15 (free since 2025): one scrubbable timeline with a beat per event, placed at compressed times (`eventTimes`), classified by `classifyEvent`. Hero rocket drawn not to scale (`sceneLayout`: fixed hull width, clamped slenderness) with gradient-shaded hull, stage bands, engine bells, Falcon legs and fins, Starship flaps; soft blurred plume with a bright core and pad glow; a "camera" that lets the pad fall away, fades in stars and raises Earth's limb as the rocket climbs; a Max-Q shiver; eased separations with tumble and puffs; payload with solar panels revealed and deployed. Preview loops with a hold; live mode tweens to the real clock every second; clicking an event tweens to it; reduced motion seeks instantly and never autoplays. Scanline overlay halved so bright shapes stop striping.

## Learn

- **Timeline thinking**: a GSAP timeline is a list of tweens at absolute times with labels; scrubbing, seeking and syncing to a clock come for free. React renders the SVG once; GSAP mutates it (`gsap.context` scopes selectors and reverts everything on unmount).
- **Craft beats accuracy**: nothing became more physically true, yet it reads as a launch because of shading, easing, camera and a plume that never holds still.
- **Compressed time**: 0.8 s per countdown step, 2.4 s per flight step; the readout still shows the real T± because the clock is interpolated from the published offsets.
- **Not to scale, on purpose**: the schematic in the Vehicle panel is to scale; the animation clamps slenderness so an 18 m Electron isn't a line. Both say which they are.
- Aerospace: **Earth's limb** appears as the horizon curves within minutes of liftoff; **strongback** retracts at T-0; **Max-Q shiver** is real (Falcon 9 throttles down around it).

## Comments

- 2026-09-07 — Done after Hiba's "it looks a bit goofy" and the request for a library or a better way. GSAP chosen over Motion (scrubbable master timeline), Rive/Lottie (hand-authored per vehicle) and procedural 3D (next step if wanted). GSAP adds ~35 KB gzipped to the main chunk; `ponytail:` lazy-load the sequence panel if the bundle matters.
