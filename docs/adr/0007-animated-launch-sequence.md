# ADR-0007: The launch sequence as an animation of the vehicle

Date: 2026-09-07 · Status: accepted; rendering superseded by ADR-0008 (two clocks, compressed time and not-to-scale stand)

## Context

The static event bar (ADR-0005 era) was judged "weird and not useful", especially for launches with no firm date. Hiba wanted "a nice animation of the launch and how the rocket will change". The data available: Launch Library's per-launch `timeline` (SpaceX, MHI) with standard event names, a generic sequence otherwise, and the vehicle silhouette from ADR-0006.

## Decision

- **One component, `LaunchSequence`**: the vehicle silhouette (same `schematicLayout` as the Vehicle panel) plays through the event list. Flight state is derived from event names by regex (`sequence.ts`, pure, tested): liftoff, main engine, boosters off, stage 1 off, fairing off, second engine on/off (handles restarts), deployed, landed.
- **Declarative motion**: each part's `transform`/`opacity` is a function of flight state; CSS transitions animate the change. Flames are a CSS keyframe.
- **Two clocks**: preview compresses time on an ordinal axis (0.8 s per countdown step, 2.4 s per flight step, loop with hold); live mode follows the real T clock once it enters the sequence window.
- **Schematic scale**: each vehicle fills its own drawing; the human figure carries scale; the Falcon 9 comparison is a sentence.

## Why

- It answers "what happens and in what order" visually, works for every launch (firm date or not), and reuses the vehicle geometry already built.
- Event vocabulary is stable across providers, so no per-provider animation code.

## Consequences

- The animation is schematic, not physical: no trajectory, no altitude, no timing beyond the published offsets. Labelled as preview / compressed time.
- Timelines that lack an event (booster separation, fairing) fall back to rules (boosters gone by MECO or staging; fairing gone by SECO).
- Reduced motion disables timers and transitions; users step by clicking events.

## Addendum (2026-09-07, later): motion moved to GSAP

The first cut drove CSS transitions from React state and looked stiff ("a bit goofy"). Physical accuracy is unavailable pre-launch (no trajectories or telemetry are published), so the upgrade is craft, not data: the timeline now lives in **GSAP** (free including plugins since 2025), which gives a scrubbable master timeline with a beat per event, eased separations, a flickering plume, a camera that lets the pad fall away and Earth's limb rise, and live sync by tweening to the real clock. The rocket is drawn **not to scale** for the animation (`sceneLayout`) while the Vehicle panel's schematic stays to scale; both say so. Alternatives weighed: Motion (React springs; weaker for one scrubbable timeline), Rive/Lottie (best looking, but hand-authored per vehicle, not data-driven), procedural 3D in Three.js (more convincing still; the next step if wanted, two to three days).
