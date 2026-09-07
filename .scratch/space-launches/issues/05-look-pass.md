# 05 — Look pass

Status: needs-info
Blocked by: 03

## Delivers

`index.css` completed: Geist Mono (preconnect + `display=swap`), uppercase letter-spaced labels, hairline `border-border` rules, `Badge` variants restyled grey-only (GO bright, TBC/TBD dim, HOLD inverted), blinking block cursor after the hero T-minus, faint scanline overlay guarded by `prefers-reduced-motion`, hero/globe grid that stacks on phones. Run `web-design-guidelines` for accessibility basics (contrast, focus states, table semantics). **Hiba reviews the look here** and steers "more/less terminal".

## Done when

- Hiba has seen it and either approved or given direction that has been applied
- Contrast of dim text on background ≥ 4.5:1; every interactive row has a visible focus state
- No horizontal body scroll at 390 px

## Learn

- **Design tokens**: changing `--background` or `--radius` once restyles every component; that's the point of CSS custom properties.
- **Tabular figures**: `font-variant-numeric: tabular-nums` and why proportional digits make clocks jitter.
- **`prefers-reduced-motion`**: decorative animation is opt-out by OS setting; respecting it is an accessibility basic.
- **Perceived contrast**: near-black (`oklch(0.13 0 0)`) vs `#000` and why pure black plus pure white reads harsher on OLED.
- Aerospace: none. Pure craft ticket.

## Comments

- 2026-09-07 — CSS applied, awaiting Hiba's review. Badge variants restyled to a grey weight scale (GO solid, TBC strong outline, TBD dim outline, HOLD solid + `motion-safe:animate-pulse`). Static scanline overlay; deliberately *not* behind `prefers-reduced-motion` because it doesn't move (that query is about motion, not texture); the cursor blink and HOLD pulse are guarded. Selected row marked with a 2px left hairline instead of a fill. Hero/globe grid stacks under `lg`. Geist Mono already self-hosted from ticket 01.
- 2026-09-07 — `web-design-guidelines` review applied: theme-color meta matching the background, skip link, one click handler per row (button click bubbles to the row) with `aria-expanded`/`aria-controls` on the detail row, `break-words`/`text-pretty` on user-generated text, `translate="no"` on rocket and mission identifiers, non-breaking space in "±1 h", `touch-action: manipulation`, error copy that says what to do next. Not done: font preload (fontsource filenames are hashed by Vite; would need a plugin), aria-live (a ticking clock must not announce).
- 2026-09-07 — Superseded in part by tickets 08–10 after Hiba's review ('no images… so plain… hard to read'): table replaced by image cards, hero became a photo hero, globe built. Still awaiting Hiba's look review on the new version.
