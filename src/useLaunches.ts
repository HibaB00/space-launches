import { useEffect, useState } from 'react'
import type { Launch } from './launches'

export type LaunchFeed = { fetchedAt: string; launches: Launch[] }

// WHY: relative to Vite's BASE_URL, so the request is /space-launches/launches.json on GitHub Pages
// and /launches.json in dev. A bare "launches.json" would break if the page URL lacked its trailing slash.
const FEED_URL = `${import.meta.env.BASE_URL}launches.json`

// WHY: the deploy cron runs every 30 min; re-fetching every 10 keeps an open tab at most ~40 min behind.
const REFRESH_MS = 10 * 60_000

/**
 * Loads the JSON the fetch script baked into the build, and re-loads it periodically.
 * WHY not SWR (client-swr-dedup): there is exactly one consumer of this hook, so there is nothing to deduplicate.
 */
export function useLaunches(): { feed: LaunchFeed | null; error: string | null } {
  const [feed, setFeed] = useState<LaunchFeed | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      // WHY: cache: 'no-cache' makes the browser revalidate with the CDN instead of trusting its heuristic cache,
      // otherwise the 10-minute refresh could keep returning the same stale copy for hours.
      fetch(FEED_URL, { cache: 'no-cache' })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json() as Promise<LaunchFeed>
        })
        .then((json) => {
          if (!cancelled) {
            setFeed(json)
            setError(null)
          }
        })
        .catch((e: unknown) => {
          // WHY: a failed refresh keeps the previous feed on screen; only the error text changes.
          if (!cancelled) setError(e instanceof Error ? e.message : String(e))
        })
    load()
    const id = setInterval(load, REFRESH_MS)
    // WHY: StrictMode mounts, unmounts and remounts in dev; the flag stops the abandoned first fetch from
    // writing state, and clearing the interval stops the abandoned instance from refreshing forever.
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return { feed, error }
}
