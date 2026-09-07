// Intl formatters, built once per module (js-cache-function-results): constructing them is the expensive part.

/** Visitor's own locale and time zone. */
export const LOCAL = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
})

/** Coordinated Universal Time: what every launch provider and coverage quotes. */
export const UTC = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})

export const UTC_TIME = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})

const PAD_LOCAL = new Map<string, Intl.DateTimeFormat>()

/** Wall-clock time at the launch site (LL2 gives an IANA zone like "Asia/Qyzylorda"). One formatter per zone, cached. */
export function padLocal(timeZone: string): Intl.DateTimeFormat {
  let f = PAD_LOCAL.get(timeZone)
  if (!f) {
    // WHY: Intl throws RangeError on an unknown zone name; fall back to UTC rather than crash the row.
    try {
      f = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone,
        timeZoneName: 'short',
      })
    } catch {
      f = UTC
    }
    PAD_LOCAL.set(timeZone, f)
  }
  return f
}
