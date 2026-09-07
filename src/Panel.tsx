import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Control-centre panel: hairline frame, a label strip, optional live dot and right-hand actions. */
export function Panel({ label, live = false, actions, className, bodyClassName, children }: {
  label: string
  live?: boolean
  actions?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  return (
    <section className={cn('flex min-w-0 flex-col border border-border bg-card', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-2">
          {live ? <span aria-hidden="true" className="h-1.5 w-1.5 bg-live motion-safe:animate-pulse" /> : null}
          {label}
        </span>
        {actions ? <span className="flex items-center gap-3 normal-case tracking-normal">{actions}</span> : null}
      </header>
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}
