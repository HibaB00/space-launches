# ADR-0003: React + Vite + Tailwind v4 + shadcn/ui, dark-only, Geist Mono

Date: 2026-09-07 · Status: accepted

## Context

A one-page site: hero countdown, a table of 20 launches, a 3D globe. Hiba wants a terminal *feel* (black and white, monospace, minimal), not a literal terminal UI, and a real UI library to build on. Deployment to GitHub Pages matters.

## Decision

- **React 19 + TypeScript** (user's choice; familiar, and the globe↔table selection is shared state).
- **Vite 8** with `base: '/space-launches/'`.
- **Tailwind v4** via `@tailwindcss/vite`; **shadcn/ui** components copied in: Table, Badge, Card, Separator only. Neutral palette, dark only (`class="dark"` on `<html>`), `--radius: 0`, background pushed to near-black, **Geist Mono** from Google Fonts as the only typeface.
- Bun as package manager and test runner (`bun test`, no Vitest).

## Alternatives considered

- **Vanilla TS, no framework**: least code, but the user wanted React and a component library.
- **Bun's HTML bundler** instead of Vite: zero config, but newer and undocumented for sub-path deploys; Vite is auto-detected by every static host and `base` is one line.
- **WebTUI** (CSS TUI kit): rejected by the user as too literally a terminal.
- **Hand-written CSS, no library**: rejected; user wants primitives to build on.
- **Radix Themes**: fewer deps, but last release Jan 2025 and a stronger default look to fight.
- **Arwes** (sci-fi HUD framework): most "space", but alpha and incompatible with React strict mode.

## Consequences

- Components are source we own under `src/components/ui/`; restyling means editing them, not fighting a dependency.
- The `@/*` alias must exist in both `tsconfig` and `vite.config.ts`.
- Tailwind purges to a few KB; the runtime third-party requests are Google Fonts only.
- React practices follow Vercel's `vercel-react-best-practices` skill; rule names appear in `// WHY (...)` comments.
