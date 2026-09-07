// iCalendar (RFC 5545) output. Pure: takes the stamp as a parameter. Used by the page (one launch) and the
// fetch script (all launches → public/launches.ics, a feed a calendar app can subscribe to).
import { countdownMode, formatNet, siteName, type Launch } from './launches.ts'
import { FEED_URL, launchUrl } from './site.ts'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const dateOnly = (iso: string) => iso.slice(0, 10).replace(/-/g, '')

// WHY: RFC 5545 lines are at most 75 octets; longer ones continue on the next line after a single space.
function fold(line: string): string {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = ' ' + rest.slice(74)
  }
  out.push(rest)
  return out.join('\r\n')
}

const isTimed = (launch: Launch, stampIso: string) => countdownMode(launch, Date.parse(stampIso)) !== 'net-date'
// WHY: the title is what shows in a week view: rocket · mission, provider, and the NET when the date isn't firm.
const summaryOf = (launch: Launch, timed: boolean) =>
  `🚀 ${launch.rocket} · ${launch.mission.name} (${launch.providerAbbrev || launch.provider})${timed ? '' : ` · ${formatNet(launch)}`}`
// WHY: the description is the whole briefing: what it is, where from, how firm, where to watch, and a link back here.
const descriptionOf = (launch: Launch) =>
  [
    launch.mission.description,
    '',
    `Rocket: ${launch.rocket} (${launch.provider})`,
    `From: ${launch.pad.name}, ${siteName(launch)}, ${launch.pad.country}`,
    `Mission: ${launch.mission.type}${launch.mission.orbit && launch.mission.orbit !== 'Unknown' ? ` → ${launch.mission.orbit}` : ''}`,
    `Status: ${launch.status.name}. ${launch.status.description}`,
    '',
    launch.webcast ? `▶ Watch live: ${launch.webcast}` : '',
    `ℹ Details & countdown: ${launchUrl(launch.id)}`,
    'Times can slip. Check the page before you tune in. Data: Launch Library 2.',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n')
const locationOf = (launch: Launch) => `${launch.pad.name}, ${launch.pad.location}`
// WHY: an instantaneous window has no length; give the event an hour so it shows up as a block, not a line.
const endOf = (launch: Launch) =>
  launch.windowEnd && Date.parse(launch.windowEnd) > Date.parse(launch.net) ? launch.windowEnd : new Date(Date.parse(launch.net) + 3_600_000).toISOString()

/** Google Calendar "new event" link with the launch prefilled. Google applies the user's own default reminders. */
export function googleCalendarUrl(launch: Launch, stampIso: string): string {
  const timed = isTimed(launch, stampIso)
  const nextDay = new Date(Date.parse(launch.net) + 86_400_000).toISOString()
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summaryOf(launch, timed),
    dates: timed ? `${stamp(launch.net)}/${stamp(endOf(launch))}` : `${dateOnly(launch.net)}/${dateOnly(nextDay)}`,
    details: descriptionOf(launch),
    location: locationOf(launch),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Google Calendar's "add calendar from URL" dialog for the whole feed. Needs the deployed URL; Google can't fetch localhost. */
export const googleSubscribeUrl = () => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(FEED_URL)}`

export function launchEvent(launch: Launch, stampIso: string): string[] {
  const timed = isTimed(launch, stampIso)
  const summary = summaryOf(launch, timed)
  const description = descriptionOf(launch)
  const lines = [
    'BEGIN:VEVENT',
    // WHY: a stable UID per launch lets a calendar app *update* the event when the time slips instead of duplicating it.
    `UID:${launch.id}@space-launches`,
    `DTSTAMP:${stamp(stampIso)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(locationOf(launch))}`,
    `GEO:${launch.pad.lat ?? 0};${launch.pad.lon ?? 0}`,
  ]
  // WHY: the event's URL is the launch page (always exists); the webcast link lives in the description.
  lines.push(`URL:${launchUrl(launch.id)}`)
  if (timed) {
    lines.push(`DTSTART:${stamp(launch.net)}`, `DTEND:${stamp(endOf(launch))}`)
    // WHY: a 15-minute alarm is the "notification". Calendars deliver it on every device with no server or permission prompt.
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`Launch in 15 minutes: ${summary}`)}`, 'TRIGGER:-PT15M', 'END:VALARM')
  } else {
    // WHY: a date known only to the day/month/quarter becomes an all-day event with no alarm; a timed alarm would be a lie.
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(launch.net)}`)
  }
  lines.push('END:VEVENT')
  return lines
}

export function calendar(events: string[][], name: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//space-launches//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`,
    'X-WR-TIMEZONE:UTC',
    ...events.flat(),
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

export const launchIcs = (launch: Launch, stampIso: string) => calendar([launchEvent(launch, stampIso)], `${launch.rocket} · ${launch.mission.name}`)
export const feedIcs = (launches: Launch[], stampIso: string) => calendar(launches.map((l) => launchEvent(l, stampIso)), 'Upcoming rocket launches')
