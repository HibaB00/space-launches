# 01 — Scaffold React + shadcn page with terminal feel

Status: resolved
Blocked by: —

## Delivers

Vite `react-ts` template copied in, demo files removed. Tailwind v4 via `@tailwindcss/vite`, `@/*` path alias, `@types/node`, `@types/bun`. `shadcn init` (neutral, CSS variables) and `shadcn add table badge card separator`. `vite.config.ts` with react + tailwind plugins, alias and `base: '/space-launches/'`. `<html class="dark">`. `index.css` overrides: radius 0, near-black background, Geist Mono. `bunx vite` serves a near-black monospace page where `<App/>` renders a `Card` hero with placeholder text, a `Badge` and a blinking cursor. First commit; private GitHub repo pushed.

## Done when

- `bunx vite` shows the placeholder hero at `http://localhost:5173/space-launches/`
- `bunx tsc -b --noEmit` clean, `bun test` runs (0 tests is fine)
- `git log` has one commit; `gh repo view HibaB00/space-launches` works

## Learn

- **Vite `base`**: why a project site on GitHub Pages lives under `/space-launches/` and what breaks if asset URLs are absolute.
- **Tailwind v4 CSS-first config**: `@import "tailwindcss"` + `@theme` replaces `tailwind.config.js`; tokens are CSS custom properties.
- **shadcn's copy-in model**: components are source files you own, not a dependency you can't change; `cn()` = `clsx` + `tailwind-merge`.
- **Path aliases**: the same alias must be declared twice (TypeScript for types, Vite for the bundler) because they are two different resolvers.
- Aerospace: none yet. The glossary starts in ticket 02.

## Comments

- 2026-09-07 — Done. Deviations from the plan: shadcn CLI is now v4 (`init -t vite -b radix -p nova`, base colour is fixed to neutral by the preset); it self-hosts fonts via fontsource, so Geist Mono comes from `@fontsource-variable/geist-mono` instead of Google Fonts (zero third-party requests). Kept `button.tsx` that init generates: needed for an accessible row-select control in ticket 03. TS 6 deprecates `baseUrl`, so only `paths` is set.
