import { Fragment, type ReactNode } from 'react'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { countdownMode, countdownText, type Launch } from './launches'
import { StatusBadge } from './StatusBadge'
import { padLocal, UTC_TIME } from './time'

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
          {launches.map((launch) => {
            const selected = launch.id === selectedId
            return (
              <Fragment key={launch.id}>
                <LaunchRow launch={launch} now={now} selected={selected} onSelect={onSelect} />
                {/* WHY: details render as a second <tr> under the selected row, so on a phone (where the hero is
                    off-screen) the tap that selects a launch also reveals what it is. colSpan keeps the table valid. */}
                {selected ? <DetailRow launch={launch} now={now} /> : null}
              </Fragment>
            )
          })}
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
          aria-expanded={selected}
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

function DetailRow({ launch, now }: { launch: Launch; now: number }) {
  const net = new Date(launch.net)
  const timed = countdownMode(launch, now) !== 'net-date'
  const hasWindow = launch.windowStart && launch.windowEnd && launch.windowStart !== launch.windowEnd
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={5} className="whitespace-normal p-4 sm:p-6">
        <div className="max-w-3xl space-y-4 text-sm">
          <p>{launch.mission.description || 'No mission description published yet.'}</p>
          <Separator />
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5">
            <Fact label="Type">{launch.mission.type}</Fact>
            <Fact label="Orbit">
              {launch.mission.orbit}
              {launch.mission.orbitAbbrev && launch.mission.orbitAbbrev !== 'N/A' ? ` (${launch.mission.orbitAbbrev})` : ''}
            </Fact>
            <Fact label="Provider">{launch.provider}</Fact>
            <Fact label="Pad">
              <a href={launch.pad.mapUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                {launch.pad.name}
              </a>
              , {launch.pad.location}
            </Fact>
            {timed ? <Fact label="Local at pad">{padLocal(launch.pad.timezone).format(net)}</Fact> : null}
            {timed && hasWindow ? (
              <Fact label="Window">
                {UTC_TIME.format(new Date(launch.windowStart!))}–{UTC_TIME.format(new Date(launch.windowEnd!))} UTC
              </Fact>
            ) : null}
            {launch.webcast ? (
              <Fact label="Webcast">
                <a href={launch.webcast} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                  {new URL(launch.webcast).hostname.replace(/^www\./, '')}
                </a>
              </Fact>
            ) : null}
          </dl>
        </div>
      </TableCell>
    </TableRow>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  )
}
