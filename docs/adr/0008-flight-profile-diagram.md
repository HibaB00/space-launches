# ADR-0008: The launch sequence drawn as a flight profile, driven by a Pose

Date: 2026-09-08 · Status: accepted

## Context

ADR-0007's animation (GSAP over a 320×400 SVG) was judged "still a bit cheap looking" with "weird dimensions": a small portrait scene beside empty panel space, hard outlines, uniform stars, a floating strongback. Hiba first chose a three.js scene, saw it, and rejected it ("soo ugly, I liked the 2D more"); shaded SVG was rejected too ("I liked it better when it was drawn"). The visual she pointed at is the SpaceX launch-page **flight profile**: a line-art trajectory with the vehicle drawn at each milestone and labelled.

## Decision

- **A flight profile, full width.** The panel's stage is a landscape SVG whose viewBox width follows the container. The ascent arc runs from the pad (left) to the top right; every flight event is a marker on it with a silhouette of the vehicle as it is at that moment; first-stage return events (entry burn, landing) sit on a dashed return leg. The readout (T± clock, event, description) overlays the top-left; the scrubber stays below.
- **Line art only.** Flat `var(--card)` fills, one-pixel `var(--foreground)` / `var(--muted-foreground)` strokes with `vector-effect: non-scaling-stroke`, one ice-blue accent for what is live (flown arc, current marker, plume). No gradients, no shading, no 3D.
- **GSAP tweens a `Pose`, the stage renders it.** `pose.ts` builds the timeline over a plain object of 0..1 fields (throttles, lift, arc progress `p`, separations, deploy, shiver) with the same back-fill rules as before (boosters gone by MECO, fairing by SECO). `LaunchStage.render(pose)` writes SVG attributes and keeps no time of its own. Frames are drawn from the timeline's `onUpdate`; there is no animation loop.
- **Diagram maths is pure and tested** (`profile.ts`): arc-length sampled Béziers so markers are spaced by distance; `configAt` for the silhouettes; a greedy `placeLabels` that keeps labels inside the frame and clear of the readout, silhouettes and each other.
- **Markers by flight ordinal, `p` linear.** Every flight step plays for 2.4 s and markers are spaced by ordinal, so a linear `p` lands the vehicle on each marker exactly at its event.

## Why

- It answers "what will happen" at a glance (the SpaceX genre), and it animates: the vehicle flies the arc and changes on the beats, the flown part lights up.
- A pose seam let three renderers (SVG, three.js, this diagram) be tried against one tested timeline in a day, and turns the old `flightState` rules into tests of the code that runs.
- Line art matches the rest of the site (wireframe globe, schematic, hairline panels); rendering broke the set.

## Alternatives rejected

- **three.js scene** (procedural rocket, GPU plume, Earth limb, bloom): built, working, rejected on look. Free glTF models exist only for Falcon 9 / NASA vehicles anyway.
- **Shaded SVG with a chase camera**: read as "3D"; also fought the readout for space.
- **GSAP plugins** (MotionPath, DrawSVG, Physics2D): not needed once the pose drives attributes; the arc maths is twenty lines.

## Consequences

- Not to scale, labelled so. The arc is the shape of a gravity turn, not a trajectory; the return leg descends under the ascent rather than looping above it (the loop crossed labels in a 420 px frame).
- Labels hide on narrow frames except the current one; the scrubber names the rest.
- ADR-0007 stands for the two clocks, compressed time and the vehicle geometry; its rendering is superseded here.
