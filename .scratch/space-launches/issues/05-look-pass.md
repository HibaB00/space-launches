# 05 — Look pass

Status: ready-for-agent
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
