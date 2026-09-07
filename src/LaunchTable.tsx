import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { countdownText, type Launch } from './launches'
import { StatusBadge } from './StatusBadge'

type Props = {
  launches: Launch[]
  now: number
  selectedId: string | null
  onSelect: (id: string) => void
}

export function LaunchTable({ launches, now, selectedId, onSelect }: Props) {
  return (
    // WHY: the table scrolls inside its own box on narrow screens; the page body never scrolls sideways.
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="text-xs uppercase tracking-widest">
            <TableHead>T-minus</TableHead>
            <TableHead>Rocket</TableHead>
            <TableHead>Mission</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {launches.map((launch) => (
            <LaunchRow
              key={launch.id}
              launch={launch}
              now={now}
              selected={launch.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// WHY (rerender-no-inline-components): defined at module level, not inside LaunchTable, or React would
// see a new component type every render and remount all twenty rows each second.
function LaunchRow({
  launch,
  now,
  selected,
  onSelect,
}: {
  launch: Launch
  now: number
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <TableRow
      data-state={selected ? 'selected' : undefined}
      onClick={() => onSelect(launch.id)}
      className="cursor-pointer"
    >
      <TableCell className="whitespace-nowrap">{countdownText(launch, now)}</TableCell>
      <TableCell className="whitespace-nowrap">{launch.rocket}</TableCell>
      <TableCell>
        {/* WHY: a <tr> can't take keyboard focus; this button gives keyboard and screen-reader users the same action as the row click. */}
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => onSelect(launch.id)}
          className="text-left hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {launch.mission.name}
        </button>
      </TableCell>
      <TableCell className="text-muted-foreground">{launch.pad.location}</TableCell>
      <TableCell>
        <StatusBadge status={launch.status} />
      </TableCell>
    </TableRow>
  )
}
