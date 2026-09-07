import { useEffect, useState } from 'react'
import type { Launch } from './launches'

export type LaunchFeed = { fetchedAt: string; launches: Launch[] }

// WHY: relative to Vite's BASE_URL, so the request is /space-launches/launches.json on GitHub Pages
// and /launches.json in dev. A bare "launches.json" would break if the page URL lacked its trailing slash.
const FEED_URL = `${import.meta.env.BASE_URL}launches.json`

/**
 * Loads the JSON the fetch script baked into the build.
 * WHY not SWR (client-swr-dedup): there is exactly one consumer of this hook, so there is nothing to deduplicate.
 */
export function useLaunches(): { feed: LaunchFeed | null; error: string | null } {
  const [feed, setFeed] = useState<LaunchFeed | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(FEED_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<LaunchFeed>
      })
      .then((json) => {
        if (!cancelled) setFeed(json)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    // WHY: StrictMode mounts, unmounts and remounts in dev; the flag stops the first (abandoned) fetch
    // from writing state after its component instance is gone.
    return () => {
      cancelled = true
    }
  }, [])

  return { feed, error }
}
