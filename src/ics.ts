// iCalendar (RFC 5545) output. Pure: takes the stamp as a parameter. Used by the page (one launch) and the
// fetch script (all launches → public/launches.ics, a feed a calendar app can subscribe to).
import { countdownMode, formatNet, type Launch } from './launches.ts'

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

export function launchEvent(launch: Launch, stampIso: string): string[] {
  const timed = countdownMode(launch, Date.parse(stampIso)) !== 'net-date'
  const summary = `${launch.rocket} · ${launch.mission.name}${timed ? '' : ` (${formatNet(launch)})`}`
  const description = [
    launch.mission.description,
    launch.webcast ? `Watch live: ${launch.webcast}` : '',
    `Status: ${launch.status.name}. Times can slip; check the site before you tune in.`,
  ]
    .filter(Boolean)
    .join('\n')
  const lines = [
    'BEGIN:VEVENT',
    // WHY: a stable UID per launch lets a calendar app *update* the event when the time slips instead of duplicating it.
    `UID:${launch.id}@space-launches`,
    `DTSTAMP:${stamp(stampIso)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(`${launch.pad.name}, ${launch.pad.location}`)}`,
    `GEO:${launch.pad.lat ?? 0};${launch.pad.lon ?? 0}`,
  ]
  if (launch.webcast) lines.push(`URL:${launch.webcast}`)
  if (timed) {
    const end = launch.windowEnd && Date.parse(launch.windowEnd) > Date.parse(launch.net) ? launch.windowEnd : new Date(Date.parse(launch.net) + 3_600_000).toISOString()
    lines.push(`DTSTART:${stamp(launch.net)}`, `DTEND:${stamp(end)}`)
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
