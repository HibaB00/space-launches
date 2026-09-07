# 11 — Finish the control-centre rewrite

Status: resolved
Blocked by: —

## Delivers

Full-width panel dashboard (`Panel` component), UTC + local wall clocks in the header, colour photos, traffic-light status colours and a `--live` accent, Schedule panel of tiled image cards, Hero always the nearest launch. Launch page: photo header, Launch sequence panel (`LaunchTimeline`, provider timeline or labelled generic), Mission / Mission log / Launch site panels with attempt-count tiles, actions: Watch live, Add to Google Calendar, .ics, Flight Club trajectory, map.

## Learn

- **Ordinal vs linear axes**: SpaceX's bar spaces events evenly because 38 min of countdown would squash 8 min of flight; the marker interpolates between neighbours by real time.
- **Meaning-only colour**: traffic-light semantics from launch control; colour where it informs, grey everywhere else, so photos carry the rest.
- **Panel chrome**: one `Panel` component gives every region the same frame, label strip and live dot; consistency is what makes a dashboard read as one instrument.
- **Google Calendar template URL** vs `.ics`: a prefilled-event link needs no download and gets the user's own reminders; the `.ics` carries an explicit alarm and works for every other calendar.
- Aerospace: **prop load, engine chill, startup, tank press, Max-Q, MECO, SES, SECO, entry and landing burns**: the shape of a Falcon 9 flight in 19 events.

## Comments

- 2026-09-07 — Done. Screenshots of home and the USSF-153 page checked with headless Chrome. The drawn-orbit maths (`orbitProfile`, `orbitFrame`, `trajectoryPoints`) was deleted rather than kept unused; ADR-0004 records why.
