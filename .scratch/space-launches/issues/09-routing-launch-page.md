# 09 — Routes and a page per launch

Status: resolved
Blocked by: 08

## Delivers

React Router (declarative `BrowserRouter` with `basename = import.meta.env.BASE_URL`): `/` home, `/launch/:id` detail page. Feed and clock hooks live above the router so both pages share them. `dist/404.html` is a copy of `index.html` so GitHub Pages serves the app for deep links. Detail page: back link, full-bleed photo header, status, rocket · mission as `<h1>`, large T-minus, description, facts grid (type, orbit, provider, pad + map, local time at pad, window, webcast, credits), mission patch when present. Document title updates per page.

## Done when

- Reloading `/space-launches/launch/<id>` works locally (`vite preview`) and the 404 fallback is in `dist/`
- Browser back returns to the list with the selection preserved by URL
- Unknown id renders a "launch not found" page with a link home

## Learn

- **URL reflects state**: selection lives in the URL, not in `useState`; back/forward and deep links come for free.
- **SPA fallback on static hosts**: why a 404 page that *is* the app makes client-side routing work on GitHub Pages.
- **`basename`**: the same sub-path problem as Vite's `base`, one layer up.
- **Shared state above the router**: hooks in the root component, pages read via props or context.
- Aerospace: none.

## Comments

- 2026-09-07 — Done. react-router `BrowserRouter basename=BASE_URL`, routes `/`, `/launch/:id`, `*`. Build copies `index.html` → `404.html`; verified with `vite preview` that a deep link returns 200. Page `<title>` via React 19 head hoisting. `ScrollToTop` effect on route change. Feed + clock hooks live in `App` above the router.
