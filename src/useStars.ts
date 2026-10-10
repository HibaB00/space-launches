import { useCallback, useSyncExternalStore } from 'react'

// WHY: starred launches live in localStorage (per browser, no account, no server: the site's premise). The store is a
// JSON array of ids; a snapshot string keeps useSyncExternalStore's referential check cheap and correct.
const KEY = 'space-launches:stars'
const listeners = new Set<() => void>()
const read = (): string => {
  try {
    return localStorage.getItem(KEY) ?? '[]'
  } catch {
    return '[]'
  }
}
const write = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* private mode or storage disabled: stars just don't persist */
  }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  window.addEventListener('storage', l) // another tab starred something
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', l)
  }
}

export function useStars(): { stars: Set<string>; toggle: (id: string) => void } {
  const raw = useSyncExternalStore(subscribe, read, () => '[]')
  const stars = new Set<string>(JSON.parse(raw) as string[])
  const toggle = useCallback((id: string) => {
    const next = new Set<string>(JSON.parse(read()) as string[])
    if (next.has(id)) next.delete(id)
    else next.add(id)
    write([...next])
  }, [])
  return { stars, toggle }
}
