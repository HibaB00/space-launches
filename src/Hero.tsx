import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { countdownMode, countdownText, type Launch } from './launches'
import { StatusBadge } from './StatusBadge'
import { LOCAL, UTC } from './time'

const PRECISION_NOTE: Record<string, string> = {
  HR: '±1\u00a0h · T-0 known to the hour',
  MIN: 'T-0 known to the minute',
}

export function Hero({ launch, now }: { launch: Launch; now: number }) {
  const mode = countdownMode(launch, now)
  const net = new Date(launch.net)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3 text-xs font-normal uppercase tracking-widest text-muted-foreground">
          {mode === 'tplus' ? 'Liftoff · awaiting update' : mode === 'hold' ? 'Countdown holding' : 'Next launch'}
          <StatusBadge status={launch.status} />
          {PRECISION_NOTE[launch.netPrecision] && mode === 'tick' ? (
            <span className="normal-case tracking-normal">{PRECISION_NOTE[launch.netPrecision]}</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-4xl sm:text-5xl">
          {countdownText(launch, now)}
          <span className="cursor" aria-hidden="true">
            ▌
          </span>
        </p>
        <p className="break-words text-lg" translate="no">
          {launch.rocket} <span className="text-muted-foreground">·</span> {launch.mission.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {launch.pad.name} — {launch.pad.location} · {launch.providerAbbrev || launch.provider}
        </p>
        {mode === 'net-date' ? null : (
          <p className="text-sm text-muted-foreground">
            <time dateTime={launch.net}>{LOCAL.format(net)}</time> · {UTC.format(net)} UTC
          </p>
        )}
      </CardContent>
    </Card>
  )
}
