# Space Launches — domain glossary

Vocabulary used in code, UI and tickets. Aerospace terms first, then project/software terms. Add a term the first time code or UI uses it.

## Launch timing

- **NET (No Earlier Than)**: the earliest a launch can happen. Not a promise. Most schedule entries are NETs until close to launch.
- **T-0 (T-zero)**: the planned moment of liftoff. Countdowns are **T-minus** (before) and **T-plus** (after). Coverage keeps counting T+ after liftoff.
- **Launch window**: the span (`window_start`–`window_end`) in which the mission can launch and still reach its target. An **instantaneous window** is a single second, typical for rendezvous with the ISS.
- **net_precision**: Launch Library 2's flag for how well the time is known: Second, Minute, Hour, Day, Week, Month, Quarter, Half, Year. We only tick a countdown for Hour or finer; coarser shows "NET <date>".
- **Hold**: a pause in the countdown clock. **Built-in holds** are planned pauses (e.g. T-20 min) to absorb slack; an unplanned hold means a problem. **Scrub**: the attempt is cancelled for the day.
- **Status vocabulary** (LL2): **Go** (T-0 confirmed by official or reliable sources), **TBC** (to be confirmed: date/time expected but awaiting official confirmation), **TBD** (to be determined: date is an estimate), **Hold**, **In Flight**, **Success**, **Failure**, **Partial Failure**.
- **Flown**: a launch whose status is terminal (Success, Failure, Partial Failure). Shown with its **outcome** instead of a countdown, and kept in the **archive** (`data/past.json`, ADR-0009) so its page and calendar links keep working.
- **Landing outcome**: LL2 records `attempt` and `success` per booster; an expended core has a landing record with `attempt: false` (location "ATL", the Atlantic), which we do not call a landing.

## Places

- **Launch site / location**: the range or spaceport (Cape Canaveral SFS, Vandenberg SFB, Baikonur, Jiuquan, Kourou, Mahia). **Pad**: a specific launch complex at a site (SLC-40, LC-39A). LL2 gives both, with lat/lon for each.
- **Latitude matters**: launching eastward from near the equator adds Earth's rotational speed (~465 m/s at the equator) for free. Polar and sun-synchronous orbits launch from high-latitude or coastal sites that can fly south over water (Vandenberg).

## Missions and orbits

- **LSP (Launch Service Provider)**: the company or agency that flies the rocket (SpaceX, CASC, Arianespace, Rocket Lab, ISRO). May differ from the payload's owner.
- **Mission type**: LL2 taxonomy: Communications, Earth Science, Navigation, Human Exploration, Resupply, Test Flight, Dedicated Rideshare, Government/Top Secret, Unknown…
- **Orbit abbreviations**: **LEO** low Earth orbit (~160–2000 km; ISS, Starlink). **SSO** sun-synchronous orbit (polar-ish LEO that passes over any point at the same local solar time; Earth observation). **GTO** geostationary transfer orbit (elliptical, the payload raises itself to **GEO** at 35,786 km). **MEO** medium (GPS). **PO** polar orbit (inclination ~90°, covers the whole globe). **TLI** trans-lunar injection. **Mars**: LL2 uses the destination body as the "orbit" for interplanetary missions. **Sub** / sub-orbital: doesn't complete an orbit. **N/A**: unknown or undisclosed payload.

## Trajectory (illustrative, see ADR-0004)

- **Inclination**: the angle between the orbital plane and the equator. A launch site can only reach inclinations ≥ its own latitude without a costly plane change, so equatorial sites (Kourou, 5°N) are prized and ISS flies at 51.6° to be reachable from Baikonur (46°N).
- **Prograde / retrograde**: with or against Earth's rotation. Prograde launches head east (north-east from the Cape); **SSO** is slightly retrograde (~97.5°) so its plane precesses once a year, which is why SSO flights head south from Vandenberg, Jiuquan and Mahia.
- **Launch azimuth**: the compass heading at liftoff; set by the target inclination and the pad latitude: sin(az) = cos(i) / cos(lat). ISS (51.6°) from the Cape (28.5°N) gives 45°, north-east. For polar and retrograde orbits the southbound solution (180° − az) is flown so the rocket heads over open water. Drawn on the globe as a short line from the pad, labelled illustrative.
- **Terminator**: the day/night line, a great circle 90° from the **subsolar point** (where the sun is overhead). Its longitude comes from UTC time and the **equation of time** (the sundial's drift of up to ±16 minutes through the year); its tilt from the sun's declination (±23.44°). Drawn on the globe, refreshed every minute.
- **Insertion**: the moment the vehicle reaches orbital velocity; we draw it 30° downrange, roughly where real upper stages cut off.
- **GTO → GEO**: the rocket leaves the satellite in an ellipse (perigee low, apogee at 35,786 km); the satellite's own engine circularises at apogee.

## Launch sequence (as LL2 publishes it, SpaceX vocabulary)

- **Prop load**: propellant loading (RP-1 kerosene and sub-cooled liquid oxygen on Falcon 9) starts about T-35 min; **Engine chill**: cold propellant flows through the engines so they don't shock on ignition (T-7 min); **Startup**: the flight computer takes over the final minute; **Tank press**: tanks pressurised to flight levels; **Ignition** at T-3 s; **Liftoff** at T-0.
- **Max-Q**: maximum aerodynamic pressure on the vehicle (~T+1:10), when the air is still thick and the rocket already fast; engines throttle down around it.
- **MECO**: main engine cut-off, the first stage stops burning (~T+2:30); **Stage separation** follows seconds later; **SES-1**: first second-engine start; **Fairing separation** once the air is thin enough not to matter; **Entry burn** and **Landing burn** bring a reusable first stage back; **SECO**: second-engine cut-off, orbital velocity reached (~T+8:30); **Deploy**: payload separation.
- **Strongback / umbilical tower**: the pad structure that holds, fuels and powers the rocket until T-0 and swings away at liftoff.
- **Engine restart**: upper stages often burn twice (SES-1 → SECO-1, coast, SES-2 → SECO-2) to raise an orbit or leave Earth; H3's MMX flight coasts for an hour between burns.
- **Ordinal timeline**: events drawn with equal spacing regardless of the time between them, as SpaceX's webcast bar does; a linear axis would squash 8 minutes of flight against 38 minutes of countdown.
- **Gravity turn**: the shape of an ascent: vertical off the pad, a small pitch-over, then gravity bends the path toward horizontal while thrust stays along the velocity vector; by MECO the vehicle is moving mostly sideways. Our arc has this shape but is not a trajectory.
- **Flight profile**: the side-view infographic of a mission (SpaceX's launch pages): the ascent arc with the vehicle drawn at each milestone, labelled, plus the booster's **return leg** (entry burn, landing burn, landing) for reusable first stages, and a **descent leg** for an upper stage that comes back (Starship's belly-flop and landing, Dragon's re-entry). Rule of thumb used by the code: a landing *before* SECO is the booster's, a landing *after* it is the upper stage's, because a booster is always down before the second stage finishes burning.
- **Burn pair**: providers publish a burn as two events (startup, shutdown). The profile draws one marker with both times, as SpaceX does; the scrubber keeps both.
- **Boostback burn**: a reusable booster flips after separation and burns against its velocity to head back toward the launch site (RTLS, return to launch site). Without it the booster continues downrange to a droneship. On Falcon 9 the boostback brackets the fairing separation in time.

## Vehicle

- **Stage**: a self-contained section (tanks + engines) discarded when empty; **interstage** joins two stages; **strap-on booster**: an extra stage bolted to the side of the core (Falcon Heavy, Ariane 6 P120C); **core**: the central first stage.
- **Fairing**: the nose shell protecting the payload; **capsule**: a crew or cargo spacecraft that replaces the fairing.
- **Flight-proven**: a booster that has flown before; **serial** (B1081): identity of a specific core; **droneship / ASDS**: autonomous barge landing platform (OCISLY, JRTI, ASOG); **downrange**: distance from the pad to the landing point, a proxy for how much energy the mission needed.
- **Payload to LEO / GTO**: mass the vehicle can deliver to those orbits; the two headline numbers of a rocket's class.
- **Liftoff thrust** (kN) vs **liftoff mass** (t): thrust must exceed weight (mass × 9.81) or it doesn't leave the pad; Falcon 9: 7,607 kN vs 549 t × 9.81 ≈ 5,386 kN → thrust-to-weight ≈ 1.4.

## Project / software terms

- **Route / basename**: a client-side URL pattern (`/launch/:id`); `basename` is the sub-path the app lives under on GitHub Pages.
- **SPA fallback**: a static host's 404 page that is a copy of the app, so deep links to client routes still load.
- **Scrim**: a gradient under text placed over a photo, guaranteeing contrast regardless of the image.
- **Link card**: a whole card that is one `<a>`, so it works with middle-click, keyboard and screen readers.
- **iCalendar / .ics (RFC 5545)**: the text format calendars import or subscribe to; `UID` identifies an event across updates, `VALARM` is the reminder, lines fold at 75 octets.
- **Occluder**: a solid object drawn just under a wireframe so the far side is hidden by the depth test.
- **Pose**: the plain object of 0..1 numbers GSAP tweens for the launch sequence (`pose.ts`); the stage is a pure function of it, so scrubbing, live sync and reduced-motion seeks draw identical frames and the beats are testable without a DOM.
- **Render on update**: drawing frames from the timeline's `onUpdate` instead of a `requestAnimationFrame` loop; a paused animation then costs nothing.
- **Greedy label placement**: for each label in order, try anchors (below, above, right, left) and take the first box clear of everything placed so far; simple, deterministic, never overlaps (`profile.ts`).

- **Launch (view model)**: the trimmed record our UI reads (`src/launches.ts`), produced from an LL2 record by `toLaunch()` in the fetch script. Upstream shape never reaches the browser.
- **Build-time data / JAMstack**: data is fetched when the site is built, not when a visitor loads it. The site is static; a scheduled rebuild makes it "dynamic".
- **Cron workflow**: a GitHub Actions job triggered on a schedule (`*/30 * * * *` = every 30 min).
- **Rate limit (per IP)**: LL2 allows 15 requests/hour per client IP on the free tier. Fetching at build time means one IP (the CI runner) spends ~2/hour.
- **CORS**: browser rule requiring a server to opt in (`Access-Control-Allow-Origin`) before a page from another origin may read its response. LL2 opts in (`*`), but we don't rely on it.
- **Design tokens**: named CSS custom properties (`--background`, `--radius`) that every component reads; change once, restyle everything.
- **Tabular figures**: digits of equal width (`font-variant-numeric: tabular-nums`) so a ticking clock doesn't jitter.
- **Pure function / seam**: `launches.ts` and `geo.ts` take all inputs as parameters (including `now`) and touch no DOM, network or clock, so they are the tested seam.
