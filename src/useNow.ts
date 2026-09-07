import { useEffect, useState } from 'react'

/** The page's single clock. Every countdown derives from this one value. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    // WHY: one interval for the whole page. Twenty rows with their own intervals would schedule
    // twenty re-renders a second at slightly different moments; one clock means one render per tick.
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
