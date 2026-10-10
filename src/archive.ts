// The archive of flown launches: pure merge rules, used by the fetch script and tested without the network.
import type { Launch } from './launches.ts'

/**
 * Upsert `incoming` into `existing` by id (newer data wins: LL2 keeps editing a launch for days after it flies),
 * newest liftoff first. Nothing is ever dropped: the archive only grows.
 */
export function mergeArchive(existing: Launch[], incoming: Launch[]): Launch[] {
  const byId = new Map(existing.map((l) => [l.id, l]))
  for (const l of incoming) byId.set(l.id, l)
  return [...byId.values()].sort((a, b) => Date.parse(b.net) - Date.parse(a.net))
}
