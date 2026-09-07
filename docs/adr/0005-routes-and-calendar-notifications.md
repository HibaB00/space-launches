# ADR-0005: A page per launch, and calendar events as the notification mechanism

Date: 2026-09-07 · Status: accepted

## Context

After the first build Hiba asked for a separate page per launch (with the trajectory animation), a visible link to watch live, and a way to be notified before a launch.

## Decision

- **React Router** (`BrowserRouter` with `basename` = Vite base): `/` and `/launch/:id`. The launch id lives in the URL, not in component state, so back/forward and deep links work. GitHub Pages serves `404.html` for unknown paths, so the build copies `index.html` to `404.html`: the "not found" page *is* the app, which then routes client-side.
- **Watch live**: the highest-priority `vid_urls` entry becomes a "Watch live" button; YouTube webcasts are also embedded (privacy-enhanced `youtube-nocookie` domain).
- **Notifications = calendar events.** Per launch, an "Add to calendar" button downloads a `.ics` with the launch time, the webcast URL and a 15-minute alarm. The fetch script also writes `launches.ics`, a feed of all 20 launches that a calendar app can subscribe to; because it is rebuilt every 30 minutes with stable UIDs, slipped times update in the subscriber's calendar. Coarse-precision dates become all-day events with no alarm.

## Why calendar and not push, email or SMS

A static site cannot send Web Push once the tab is closed without a push server, and email/SMS need a service and stored contact details. A calendar alarm reaches every device the visitor owns, needs no permission prompt, no server and no personal data.

## Consequences

- Client-side routing means the feed and clock hooks live above the router in `App`, passed to pages as props.
- The `.ics` module is pure and tested (RFC 5545 folding at 75 octets, CRLF, escaping, all-day vs timed).
- Subscribed calendars refresh on their own schedule (Google: hours; Apple: configurable), so the feed is a "day-of" reminder, not a minute-accurate alert.
