import { Badge, type badgeVariants } from '@/components/ui/badge'
import type { VariantProps } from 'class-variance-authority'
import type { Launch } from './launches'

type Variant = VariantProps<typeof badgeVariants>['variant']

// WHY: LL2 status abbrevs → visual weight. Go is the only one to render bright; everything less firm is dimmer.
// Outcomes (archive): Success green, Failure red without the pulse (nothing is still happening), Partial amber.
const VARIANT: Record<string, Variant> = {
  Go: 'default',
  'In Flight': 'live',
  TBC: 'secondary',
  TBD: 'outline',
  Hold: 'destructive',
  Success: 'default',
  Failure: 'nogo',
  'Partial Failure': 'secondary',
}

export function StatusBadge({ status }: { status: Launch['status'] }) {
  return (
    <Badge variant={VARIANT[status.abbrev] ?? 'outline'} title={status.description}>
      {status.abbrev.toUpperCase()}
    </Badge>
  )
}
