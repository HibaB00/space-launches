# Space Launches — domain glossary

Vocabulary used in code, UI and tickets. Aerospace terms first, then project/software terms. Add a term the first time code or UI uses it.

## Launch timing

- **NET (No Earlier Than)**: the earliest a launch can happen. Not a promise. Most schedule entries are NETs until close to launch.
- **T-0 (T-zero)**: the planned moment of liftoff. Countdowns are **T-minus** (before) and **T-plus** (after). Coverage keeps counting T+ after liftoff.
- **Launch window**: the span (`window_start`–`window_end`) in which the mission can launch and still reach its target. An **instantaneous window** is a single second, typical for rendezvous with the ISS.
- **net_precision**: Launch Library 2's flag for how well the time is known: Second, Minute, Hour, Day, Week, Month, Quarter, Half, Year. We only tick a countdown for Hour or finer; coarser shows "NET <date>".
- **Hold**: a pause in the countdown clock. **Built-in holds** are planned pauses (e.g. T-20 min) to absorb slack; an unplanned hold means a problem. **Scrub**: the attempt is cancelled for the day.
- **Status vocabulary** (LL2): **Go** (T-0 confirmed by official or reliable sources), **TBC** (to be confirmed: date/time expected but awaiting official confirmation), **TBD** (to be determined: date is an estimate), **Hold**, **In Flight**, **Success**, **Failure**, **Partial Failure**.

## Places

- **Launch site / location**: the range or spaceport (Cape Canaveral SFS, Vandenberg SFB, Baikonur, Jiuquan, Kourou, Mahia). **Pad**: a specific launch complex at a site (SLC-40, LC-39A). LL2 gives both, with lat/lon for each.
- **Latitude matters**: launching eastward from near the equator adds Earth's rotational speed (~465 m/s at the equator) for free. Polar and sun-synchronous orbits launch from high-latitude or coastal sites that can fly south over water (Vandenberg).

## Missions and orbits

- **LSP (Launch Service Provider)**: the company or agency that flies the rocket (SpaceX, CASC, Arianespace, Rocket Lab, ISRO). May differ from the payload's owner.
- **Mission type**: LL2 taxonomy: Communications, Earth Science, Navigation, Human Exploration, Resupply, Test Flight, Dedicated Rideshare, Government/Top Secret, Unknown…
- **Orbit abbreviations**: **LEO** low Earth orbit (~160–2000 km; ISS, Starlink). **SSO** sun-synchronous orbit (polar-ish LEO that passes over any point at the same local solar time; Earth observation). **GTO** geostationary transfer orbit (elliptical, the payload raises itself to **GEO** at 35,786 km). **MEO** medium (GPS). **PO** polar orbit (inclination ~90°, covers the whole globe). **TLI** trans-lunar injection. **Mars**: LL2 uses the destination body as the "orbit" for interplanetary missions. **Sub** / sub-orbital: doesn't complete an orbit. **N/A**: unknown or undisclosed payload.

## Project / software terms

- **Launch (view model)**: the trimmed record our UI reads (`src/launches.ts`), produced from an LL2 record by `toLaunch()` in the fetch script. Upstream shape never reaches the browser.
- **Build-time data / JAMstack**: data is fetched when the site is built, not when a visitor loads it. The site is static; a scheduled rebuild makes it "dynamic".
- **Cron workflow**: a GitHub Actions job triggered on a schedule (`*/30 * * * *` = every 30 min).
- **Rate limit (per IP)**: LL2 allows 15 requests/hour per client IP on the free tier. Fetching at build time means one IP (the CI runner) spends ~2/hour.
- **CORS**: browser rule requiring a server to opt in (`Access-Control-Allow-Origin`) before a page from another origin may read its response. LL2 opts in (`*`), but we don't rely on it.
- **Design tokens**: named CSS custom properties (`--background`, `--radius`) that every component reads; change once, restyle everything.
- **Tabular figures**: digits of equal width (`font-variant-numeric: tabular-nums`) so a ticking clock doesn't jitter.
- **Pure function / seam**: `launches.ts` and `geo.ts` take all inputs as parameters (including `now`) and touch no DOM, network or clock, so they are the tested seam.
