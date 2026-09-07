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
  rocket: {
    configuration: {
      name: string
      full_name: string | null
      variant?: string | null
      description?: string | null
      manufacturer?: { name: string; abbrev: string | null } | null
      families?: { name: string }[] | null
      image?: { image_url: string; credit: string | null; license: { name: string } | null } | null
      info_url?: string | null
      wiki_url?: string | null
      reusable?: boolean | null
      min_stage?: number | null
      max_stage?: number | null
      length?: number | null
      diameter?: number | null
      maiden_flight?: string | null
      launch_cost?: number | null
      launch_mass?: number | null
      leo_capacity?: number | null
      gto_capacity?: number | null
      to_thrust?: number | null
      total_launch_count?: number | null
      consecutive_successful_launches?: number | null
      successful_launches?: number | null
      failed_launches?: number | null
      attempted_landings?: number | null
      successful_landings?: number | null
    }
    launcher_stage?:
      | {
          type: string | null
          reused: boolean | null
          launcher_flight_number: number | null
          launcher: { serial_number: string | null } | null
          landing: {
            description: string | null
            downrange_distance: number | null
            landing_location: { name: string; abbrev: string | null } | null
          } | null
        }[]
      | null
    spacecraft_stage?:
      | {
          destination: string | null
          spacecraft: { name: string; spacecraft_config?: { name: string } | null }
          launch_crew?: unknown[] | null
        }[]
      | null
  }
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
  image: {
    image_url: string
    thumbnail_url: string | null
    credit: string | null
    license: { name: string; link: string | null } | null
  } | null
  mission_patches?: { name: string; image_url: string; priority?: number }[] | null
  vid_urls?: { url: string; priority?: number }[] | null
  info_urls?: { url: string }[] | null
  /** Countdown and flight events with ISO-8601 offsets from T-0, e.g. "-PT38M", "P0D", "PT2M26S". Detailed mode only. */
  timeline?: { type: { abbrev: string; description: string }; relative_time: string }[] | null
  updates?: { comment: string; created_by: string; created_on: string; info_url: string | null }[] | null
  program?: { name: string }[] | null
  flightclub_url?: string | null
  orbital_launch_attempt_count_year?: number | null
  pad_launch_attempt_count?: number | null
  agency_launch_attempt_count_year?: number | null
}

export type TimelineEvent = { abbrev: string; description: string; offsetSec: number }

/** The launch vehicle: what it is, how big, its record, and what flies today (boosters, capsule). */
export type Vehicle = {
  name: string
  family: string
  variant: string
  description: string
  manufacturer: string
  wiki: string | null
  info: string | null
  image: { url: string; credit: string; license: string } | null
  lengthM: number | null
  diameterM: number | null
  massT: number | null
  thrustKN: number | null
  leoKg: number | null
  gtoKg: number | null
  stages: number | null
  reusable: boolean
  maidenFlight: string | null
  costUsd: number | null
  record: { total: number; success: number; failed: number; streak: number; landingsAttempted: number; landingsSuccess: number }
  /** Cores and strap-on boosters flying on this launch, with their own history and landing plan. */
  boosters: { type: string; serial: string; flightNumber: number | null; reused: boolean; landing: { description: string; location: string; downrangeKm: number | null } | null }[]
  /** Crewed or cargo capsule on top, when there is one instead of a fairing. */
  spacecraft: { name: string; config: string; destination: string; crew: number } | null
}
export type LaunchUpdate = { comment: string; by: string; at: string; url: string | null }

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
  /** Rocket/launch photo from LL2, with its credit and licence name: shown wherever the photo is. */
  image: { url: string; thumb: string; credit: string; license: string } | null
  /** Mission patch artwork, when the mission has one. */
  patch: string | null
  webcast: string | null
  infoUrl: string | null
  /** Provider-published sequence, oldest first. Empty when the provider hasn't published one. */
  timeline: TimelineEvent[]
  /** Status updates from LL2 editors, newest first (max 8). */
  updates: LaunchUpdate[]
  program: string[]
  flightClub: string | null
  attempt: { orbitalYear: number | null; pad: number | null; agencyYear: number | null }
  vehicle: Vehicle
}

// WHY: official names are long for a card ("United States of America"); everything else already reads fine.
const SHORT_COUNTRY: Record<string, string> = {
  'United States of America': 'USA',
  'Russian Federation': 'Russia',
  "People's Republic of China": 'China',
  'Republic of Korea': 'South Korea',
}

/** ISO-8601 duration → seconds. LL2 uses "-PT38M", "PT2M26S", "PT1H2M3S", "P0D". */
export function parseIsoDuration(iso: string): number {
  const m = iso.match(/^(-)?P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/)
  if (!m) return NaN
  const [, neg, d, h, min, sec] = m
  const total = Number(d ?? 0) * 86_400 + Number(h ?? 0) * 3_600 + Number(min ?? 0) * 60 + Number(sec ?? 0)
  return neg ? -total : total
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** "T-38:00", "T+02:26", "T+1:02:03": the webcast clock format. */
export function formatOffset(sec: number): string {
  const sign = sec < 0 ? 'T-' : 'T+'
  const t = Math.round(Math.abs(sec))
  const h = Math.floor(t / 3_600)
  const m = Math.floor((t % 3_600) / 60)
  const s = t % 60
  return `${sign}${h > 0 ? `${h}:` : ''}${pad2(m)}:${pad2(s)}`
}

function toVehicle(rocket: LL2Launch['rocket']): Vehicle {
  const c = rocket.configuration
  const sc = rocket.spacecraft_stage?.[0]
  return {
    name: c.full_name ?? c.name,
    family: c.families?.[0]?.name ?? '',
    variant: c.variant ?? '',
    description: c.description ?? '',
    manufacturer: c.manufacturer?.name ?? '',
    wiki: c.wiki_url ?? null,
    info: c.info_url ?? null,
    image: c.image ? { url: c.image.image_url, credit: c.image.credit ?? '', license: c.image.license?.name ?? '' } : null,
    // WHY: LL2 units: length/diameter m, launch_mass t, capacities kg, thrust kN, cost USD. Kept as-is, named by unit.
    lengthM: c.length ?? null,
    diameterM: c.diameter ?? null,
    massT: c.launch_mass ?? null,
    thrustKN: c.to_thrust ?? null,
    leoKg: c.leo_capacity ?? null,
    gtoKg: c.gto_capacity ?? null,
    stages: c.max_stage ?? c.min_stage ?? null,
    reusable: c.reusable ?? false,
    maidenFlight: c.maiden_flight ?? null,
    costUsd: c.launch_cost ?? null,
    record: {
      total: c.total_launch_count ?? 0,
      success: c.successful_launches ?? 0,
      failed: c.failed_launches ?? 0,
      streak: c.consecutive_successful_launches ?? 0,
      landingsAttempted: c.attempted_landings ?? 0,
      landingsSuccess: c.successful_landings ?? 0,
    },
    boosters: (rocket.launcher_stage ?? []).map((s) => ({
      type: s.type ?? 'Core',
      serial: s.launcher?.serial_number ?? '',
      flightNumber: s.launcher_flight_number ?? null,
      reused: s.reused ?? false,
      landing: s.landing
        ? {
            description: s.landing.description ?? '',
            location: s.landing.landing_location?.abbrev ?? s.landing.landing_location?.name ?? '',
            downrangeKm: s.landing.downrange_distance ?? null,
          }
        : null,
    })),
    spacecraft: sc
      ? { name: sc.spacecraft.name, config: sc.spacecraft.spacecraft_config?.name ?? '', destination: sc.destination ?? '', crew: sc.launch_crew?.length ?? 0 }
      : null,
  }
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
      country: shortCountry(raw.pad.country?.name ?? raw.pad.location.country?.name ?? ''),
      timezone: raw.pad.location.timezone_name ?? 'UTC',
      mapUrl,
    },
    image: raw.image
      ? {
          url: raw.image.image_url,
          thumb: raw.image.thumbnail_url ?? raw.image.image_url,
          // WHY: LL2 images carry their own credit and licence; showing them is the condition of using them.
          credit: raw.image.credit ?? '',
          license: raw.image.license?.name ?? '',
        }
      : null,
    patch: [...(raw.mission_patches ?? [])].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0]?.image_url ?? null,
    webcast: vids[0]?.url ?? null,
    infoUrl: raw.info_urls?.[0]?.url ?? null,
    timeline: (raw.timeline ?? [])
      .map((e) => ({ abbrev: e.type.abbrev, description: e.type.description, offsetSec: parseIsoDuration(e.relative_time) }))
      .filter((e) => !Number.isNaN(e.offsetSec))
      .sort((a, b) => a.offsetSec - b.offsetSec),
    updates: [...(raw.updates ?? [])]
      .sort((a, b) => Date.parse(b.created_on) - Date.parse(a.created_on))
      .slice(0, 8)
      .map((u) => ({ comment: u.comment, by: u.created_by, at: u.created_on, url: u.info_url })),
    program: (raw.program ?? []).map((p) => p.name),
    flightClub: raw.flightclub_url ?? null,
    attempt: {
      orbitalYear: raw.orbital_launch_attempt_count_year ?? null,
      pad: raw.pad_launch_attempt_count ?? null,
      agencyYear: raw.agency_launch_attempt_count_year ?? null,
    },
    vehicle: toVehicle(raw.rocket),
  }
}

// WHY: most providers publish no sequence. A generic orbital profile, clearly labelled, still teaches the shape
// of a launch (Max-Q, MECO, staging, SECO, deploy). Offsets are typical for a two-stage medium-lift rocket.
export const GENERIC_TIMELINE: TimelineEvent[] = [
  { abbrev: 'Liftoff', description: 'First upward movement of the rocket', offsetSec: 0 },
  { abbrev: 'Max-Q', description: 'Maximum aerodynamic pressure on the vehicle', offsetSec: 70 },
  { abbrev: 'MECO', description: 'Main engine cut-off: the first stage stops burning', offsetSec: 160 },
  { abbrev: 'Stage sep', description: 'The first stage separates from the second', offsetSec: 165 },
  { abbrev: 'SES-1', description: 'First start of the second-stage engine', offsetSec: 172 },
  { abbrev: 'Fairing sep', description: 'The payload fairing is jettisoned once the air is thin enough', offsetSec: 200 },
  { abbrev: 'SECO-1', description: 'Second-stage engine cut-off: orbital velocity reached', offsetSec: 510 },
  { abbrev: 'Deploy', description: 'Payload separation from the second stage', offsetSec: 1_200 },
]

const shortCountry = (name: string) => SHORT_COUNTRY[name] ?? name

export type CountdownMode = 'tick' | 'tplus' | 'net-date' | 'hold'

// WHY: LL2 marks how well T-0 is known. A ticking clock is only honest for hour-or-finer precision;
// "2026-09-30" with month precision means "September", so we show a date, not a fake countdown.
const FINE_PRECISION = new Set(['SEC', 'MIN', 'HR'])

export function countdownMode(launch: Launch, now: number): CountdownMode {
  if (launch.status.abbrev === 'Hold') return 'hold'
  if (!FINE_PRECISION.has(launch.netPrecision)) return 'net-date'
  return Date.parse(launch.net) <= now ? 'tplus' : 'tick'
}

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

/** "Jiuquan Satellite Launch Center" from "Jiuquan Satellite Launch Center, People's Republic of China". */
export function siteName(launch: Launch): string {
  return launch.pad.location.split(',')[0]!.trim()
}

/** Embed URL for a YouTube webcast, or null when the webcast is hosted elsewhere. */
export function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/)|youtu\.be\/)([\w-]{11})/)
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null
}

/** Pad coordinates for the globe; launches without published coordinates are left out. */
export function padsOf(launches: Launch[]): { id: string; lat: number; lon: number }[] {
  return launches.flatMap((l) => (l.pad.lat !== null && l.pad.lon !== null ? [{ id: l.id, lat: l.pad.lat, lon: l.pad.lon }] : []))
}
