# 08 — Images and a richer home page

Status: resolved
Blocked by: 04

## Delivers

View model gains `image { url, thumb, credit, license }` and `patch`. Home page: hero becomes a full-bleed launch photo with a gradient scrim, the big T-minus, status, rocket · mission, times, and a "details →" link; the list becomes a grid of link cards (thumbnail, T-minus, rocket · mission, site, badge) each linking to the launch page. Image credit shown wherever a photo is. Globe sits beside the hero.

## Done when

- Every launch with a photo shows it; launches without one get a patterned placeholder, never a broken image
- `<img>` has `width`/`height`, `loading="lazy"` below the fold, `alt` from the image name
- The hero is legible over any photo (scrim), and the page still reads as black-and-white (photos may be desaturated)

## Learn

- **Visual hierarchy**: one dominant element (the T-minus) per screen; everything else steps down in size and contrast.
- **Scrims**: a gradient behind text is how you guarantee contrast over unknown imagery.
- **Link cards**: the whole card is one `<a>` so it works with middle-click, keyboard and screen readers; no `div onClick`.
- **Image licensing**: LL2 photos carry per-image credits and licences; attribution is the price of use.
- Aerospace: **mission patches** as a tradition (every crewed and most uncrewed missions have one).

## Comments

- 2026-09-07 — Done. `Photo` component (img with width/height/lazy/fetchpriority, hatched placeholder when no image). Hero = photo + scrim + always the nearest launch + Details/Watch live buttons + credit. List = grid of link cards with thumbnails, site shortened to `siteName()` + country. All photos `grayscale` to keep the page black-and-white.
