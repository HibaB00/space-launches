# 17 — Launch sequence as a flight profile

Status: resolved
Blocked by: 16

## Delivers

The launch-sequence panel is a full-width **flight profile** in the house line-art style, the genre SpaceX uses on its launch pages: the ascent arc from the pad at the left to the top right, a marker for every flight event with a small silhouette of the vehicle as it is at that moment (boosters gone, stage 1 gone, fairing open, payload deployed, which engines burn), uppercase labels with dotted leaders, and a dashed return leg with the booster for entry/landing events. The T+ clock, event and description overlay the top-left like a webcast; the scrubber stays below. The hero vehicle moves along the arc and changes configuration on the beats; the flown part of the arc turns ice blue; the current marker and label light up.

Architecture: GSAP tweens a plain **Pose** (`pose.ts`, 0..1 per beat, tested against the Falcon 9, H3 and generic timelines); the stage (`LaunchStage.tsx`) is a pure function `render(pose)` that only writes SVG attributes, so scrubbing backwards, live sync and reduced-motion seeks all draw identical frames. `profile.ts` holds the diagram maths: arc-length sampled curves, `configAt` (the vehicle at event i), `isReturnEvent`, and a greedy `placeLabels` that keeps labels clear of the readout, the silhouettes and each other. The dead `flightState` and its tests were replaced by `pose.test.ts` and `profile.test.ts`.

## Learn

- **Tween data, not objects**: GSAP drives twelve numbers; the drawing is a function of them. That is what made the same timeline drive an SVG scene, a three.js scene and this diagram in one afternoon, and what makes the beats testable in `bun test`.
- **Render on update**: frames are drawn from the timeline's `onUpdate`, never from a rAF loop, so a paused panel costs nothing and a reduced-motion seek draws exactly one frame.
- **Deterministic randomness**: stars and plume particles come from a seeded PRNG and `life = frac(seed + t·speed)`, so a scrubbed frame is the same every time.
- **Label placement is a packing problem**: alternating sides and rows still collided on real timelines (two booster separations two seconds apart); a greedy placer that tries anchors in order and respects reserved boxes is thirty lines and never collides.
- **Craft is composition**: what read as "cheap" was a small portrait box with hard outlines in an empty panel. What read as "3D" was shading. Filling the panel, flat fills with one-pixel ink, silhouettes and labels fixed it; realism made it worse.
- Aerospace: **gravity turn** (vertical off the pad, a small pitch-over, then gravity bends the path toward horizontal while thrust stays along velocity; mostly sideways by MECO); **return leg** (a reusable first stage flips, burns to slow its entry, and lands engines-first under grid-fin guidance); SpaceX's profile draws the return as a loop above the ascent because the booster keeps climbing ballistically after separation.

## Comments

- 2026-09-08 — Hiba's review of ticket 16 ("still a bit cheap looking", "the dimensions are weird"). A three.js scene was built and rejected the same evening ("soo ugly, I liked the 2D more"), then shaded SVG ("I don't like the 3D look, I liked it better when it was drawn"), then the target became explicit: the SpaceX launch-page flight profile. Kept: the Pose seam and the full-width layout from the 3D attempt. Deleted: `LaunchScene.ts` (three.js), the camera, the sky gradient.
- `ponytail:` on a phone only the current event is labelled and the hero can pass under the readout; the scrubber names every event. Revisit if phone use matters.
- `ponytail:` the return leg descends under the ascent instead of SpaceX's loop above it; the loop crossed the labels in a 420 px frame.
