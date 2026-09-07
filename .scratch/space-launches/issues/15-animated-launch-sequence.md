# 15 — Animated launch sequence

Status: resolved
Blocked by: 14

## Delivers

`LaunchSequence` replaces the static event bar: the vehicle silhouette plays through its own timeline. Strongback retracts and engines light at liftoff, boosters peel away, the fairing opens into two halves and a satellite appears, the first stage drops, the second stage burns between SES and SECO, the payload deploys. Preview mode compresses time (0.8 s per countdown step, 2.4 s per flight step), loops with a 3 s hold, and can be paused or stepped by clicking events; once the real countdown enters the sequence window it follows the launch clock. Pure `sequence.ts` (ordinal position, interpolated clock, flight-state rules from event names) is tested on the Falcon 9, H3 and generic timelines. Schematic now fills its own height with the human figure for scale and a "¼ of a Falcon 9" sentence.

## Learn

- **State machines from vocabulary**: MECO / SES / SECO / fairing / deploy are stable words across providers, so regexes over event names give a flight state without per-provider code. The closing `\b` on `SECO` matters: without it "second" matched.
- **Declarative animation**: each part's transform and opacity derive from the flight state; CSS transitions do the motion. No per-frame drawing code.
- **Compressed time**: ordinal playback with per-segment durations makes a 9-minute flight a 20-second story without losing the order of events.
- **Reduced motion in JS**: timers and CSS transitions both switch off when `prefers-reduced-motion` is set; the user steps by clicking.
- Aerospace: **strongback** (the pad structure that holds and fuels the rocket, swinging away at T-0), **engine restart** (SES-2 after SECO-1 for high orbits), **fairing halves** are recovered by SpaceX.

## Comments

- 2026-09-07 — Done after Hiba's review ("why can't we have a nice animation of the launch and how the rocket will change"; "ugh this is weird" about the Electron schematic under a Falcon 9 line). Headless frames verified at MECO, SECO-1 and fairing separation.
