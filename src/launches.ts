// Pure module: the tested seam. Takes data and `now` as parameters; touches no DOM, network or clock.
// Runs under Bun (fetch script, tests) and in the browser (via Vite).

/** The subset of a Launch Library 2 v2.3.0 `launches/upcoming?mode=detailed` record that we read. */
export type LL2Launch = {
  id: string
  name: string
  net: string
  net_precision: { abbrev: string; name: string } | null
  window_start: string | null
  window_end: string | null
  status: { abbrev: string; name: string; description: string }
  launch_service_provider: { name: string; abbrev: string | null } | null
  rocket: { configuration: { name: string; full_name: string | null } }
  mission: {
    name: string
    description: string | null
    type: string | null
    orbit: { name: string; abbrev: string | null } | null
  } | null
  pad: {
    name: string
    latitude: number | null
    longitude: number | null
    map_url: string | null
    country: { name: string } | null
    location: { name: string; timezone_name: string | null; country?: { name: string } | null }
  }
  image: { image_url: string } | null
  vid_urls?: { url: string; priority?: number }[] | null
  info_urls?: { url: string }[] | null
}

/** What the UI reads. Produced once by the fetch script, shipped as public/launches.json. */
export type Launch = {
  id: string
  name: string
  rocket: string
  provider: string
  providerAbbrev: string
  mission: { name: string; description: string; type: string; orbit: string; orbitAbbrev: string }
  net: string
  /** LL2 precision abbrev: SEC, MIN, HR, DAY, WK, M, Q1–Q4, H1–H2, Y. Empty when unknown. */
  netPrecision: string
  windowStart: string | null
  windowEnd: string | null
  status: { abbrev: string; name: string; description: string }
  pad: {
    name: string
    lat: number | null
    lon: number | null
    location: string
    country: string
    timezone: string
    mapUrl: string
  }
  image: string | null
  webcast: string | null
  infoUrl: string | null
}

export function toLaunch(raw: LL2Launch): Launch {
  const lat = raw.pad.latitude
  const lon = raw.pad.longitude
  // WHY: 5 of 20 real records have map_url null even though they have coordinates.
  const mapUrl = raw.pad.map_url ?? `https://www.google.com/maps?q=${lat},${lon}`
  // WHY: vid_urls are ordered by `priority` (higher = better source); take the best one and drop the rest.
  const vids = [...(raw.vid_urls ?? [])].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  return {
    id: raw.id,
    name: raw.name,
    rocket: raw.rocket.configuration.full_name ?? raw.rocket.configuration.name,
    provider: raw.launch_service_provider?.name ?? 'Unknown provider',
    providerAbbrev: raw.launch_service_provider?.abbrev ?? '',
    mission: {
      name: raw.mission?.name ?? 'Unknown payload',
      description: raw.mission?.description ?? '',
      type: raw.mission?.type ?? 'Unknown',
      orbit: raw.mission?.orbit?.name ?? 'Unknown',
      orbitAbbrev: raw.mission?.orbit?.abbrev ?? '',
    },
    net: raw.net,
    netPrecision: raw.net_precision?.abbrev ?? '',
    windowStart: raw.window_start,
    windowEnd: raw.window_end,
    status: raw.status,
    pad: {
      name: raw.pad.name,
      lat,
      lon,
      location: raw.pad.location.name,
      country: raw.pad.country?.name ?? raw.pad.location.country?.name ?? '',
      timezone: raw.pad.location.timezone_name ?? 'UTC',
      mapUrl,
    },
    image: raw.image?.image_url ?? null,
    webcast: vids[0]?.url ?? null,
    infoUrl: raw.info_urls?.[0]?.url ?? null,
  }
}

export type CountdownMode = 'tick' | 'tplus' | 'net-date' | 'hold'

// WHY: LL2 marks how well T-0 is known. A ticking clock is only honest for hour-or-finer precision;
// "2026-09-30" with month precision means "September", so we show a date, not a fake countdown.
const FINE_PRECISION = new Set(['SEC', 'MIN', 'HR'])

export function countdownMode(launch: Launch, now: number): CountdownMode {
  if (launch.status.abbrev === 'Hold') return 'hold'
  if (!FINE_PRECISION.has(launch.netPrecision)) return 'net-date'
  return Date.parse(launch.net) <= now ? 'tplus' : 'tick'
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** `T-02d 04h 17m 33s`; negative input counts up as `T+…`. Fixed width so the digits don't jitter. */
export function formatCountdown(remainingMs: number): string {
  const sign = remainingMs < 0 ? 'T+' : 'T-'
  const total = Math.floor(Math.abs(remainingMs) / 1000)
  const d = Math.floor(total / 86_400)
  const h = Math.floor((total % 86_400) / 3_600)
  const m = Math.floor((total % 3_600) / 60)
  const s = total % 60
  return `${sign}${pad2(d)}d ${pad2(h)}h ${pad2(m)}m ${pad2(s)}s`
}

// WHY: hardcoded month names instead of Intl: month abbreviations differ between ICU versions
// ("Sep" vs "Sept"), which would make this output environment-dependent.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "NET 7 Oct 2026" / "NET Sep 2026" / "NET Q3 2026" depending on how precise the NET is. */
export function formatNet(launch: Launch): string {
  // WHY: read the date in UTC. A month-precision NET is "2026-09-30T00:00:00Z"; in any western
  // time zone the local date would be the 29th, shifting the displayed month or day.
  const d = new Date(launch.net)
  const year = d.getUTCFullYear()
  const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${year}`
  const p = launch.netPrecision
  if (p === 'Y') return `NET ${year}`
  if (/^H[12]$/.test(p) || /^Q[1-4]$/.test(p)) return `NET ${p} ${year}`
  if (p === 'M') return `NET ${MONTHS[d.getUTCMonth()]} ${year}`
  if (p === 'WK') return `NET week of ${day}`
  return `NET ${day}`
}

/** The one string a countdown cell shows, whatever the mode. */
export function countdownText(launch: Launch, now: number): string {
  switch (countdownMode(launch, now)) {
    case 'tick':
    case 'tplus':
      return formatCountdown(Date.parse(launch.net) - now)
    case 'net-date':
      return formatNet(launch)
    case 'hold':
      return 'HOLD'
  }
}
