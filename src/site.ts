// WHY: calendar events and the feed subscription need absolute URLs, and a dev server on localhost is not
// reachable by Google Calendar. One constant, overridable at build time, used by the page and the fetch script.
export const SITE_URL = (typeof process !== 'undefined' && process.env?.SITE_URL) || 'https://hibab00.github.io/space-launches/'
export const launchUrl = (id: string) => `${SITE_URL}launch/${id}`
export const FEED_URL = `${SITE_URL}launches.ics`
