import type { ReactNode } from 'react'
import type { Vehicle } from './launches'
import { Panel } from './Panel'
import { compareToReference, inferBoosters, knownEngines } from './vehicle'
import { VehicleSchematic } from './VehicleSchematic'

const NUM = new Intl.NumberFormat('en-US')
const fmt = (n: number | null, unit: string) => (n === null ? null : `${NUM.format(n)} ${unit}`)
const money = (usd: number | null) => (usd === null ? null : usd >= 1e9 ? `$${(usd / 1e9).toFixed(1)}B` : `$${Math.round(usd / 1e6)}M`)

// WHY: LL2 records landing.success once the launch has flown; before that it is null and the plan is all we have.
const landingText = (b: Vehicle['boosters'][number], flown: boolean) => {
  if (!b.landing) return ' · expended'
  const where = b.landing.location || 'a landing zone'
  const downrange = b.landing.downrangeKm ? ` (${NUM.format(b.landing.downrangeKm)} km downrange)` : ''
  if (!flown || b.landing.success === null) return ` · ${flown ? 'landing outcome not yet recorded' : `lands on ${where}`}${downrange}`
  return b.landing.success ? ` · landed on ${where}${downrange}` : ` · landing on ${where} failed${downrange}`
}

export function VehiclePanel({ vehicle: v, flown = false }: { vehicle: Vehicle; flown?: boolean }) {
  const rate = v.record.total > 0 ? Math.round((v.record.success / v.record.total) * 100) : null
  const inferred = inferBoosters(v)
  const engines = knownEngines(v.name)
  const specs: [string, string | null][] = [
    ['Height', fmt(v.lengthM, 'm')],
    ['Diameter', fmt(v.diameterM, 'm')],
    ['Liftoff mass', fmt(v.massT, 't')],
    ['Liftoff thrust', fmt(v.thrustKN, 'kN')],
    ['To LEO', fmt(v.leoKg, 'kg')],
    ['To GTO', fmt(v.gtoKg, 'kg')],
    ['Stages', v.stages === null ? null : String(v.stages)],
    ['Stage 1 engines', engines ? `${engines} · reference` : null],
    ['Reusable', v.reusable ? 'yes' : 'no'],
    ['First flight', v.maidenFlight],
    ['Launch cost', money(v.costUsd)],
    ['Manufacturer', v.manufacturer || null],
    ['Family', v.family || null],
  ]
  return (
    <Panel
      label={`Vehicle · ${v.name}`}
      actions={
        <>
          {v.wiki ? (
            <a href={v.wiki} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
              Wikipedia ↗
            </a>
          ) : null}
          {v.info ? (
            <a href={v.info} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
              {v.manufacturer || 'manufacturer'} ↗
            </a>
          ) : null}
        </>
      }
      bodyClassName="grid gap-6 p-4 lg:grid-cols-[300px_minmax(0,1fr)_minmax(0,1fr)]"
    >
      <div className="space-y-2">
        {v.lengthM && v.diameterM ? (
          <>
            <VehicleSchematic vehicle={v} />
            <p className="text-[10px] text-pretty text-muted-foreground">
              {v.lengthM} m tall, {compareToReference(v.lengthM)}. Proportions from published length and diameter; the stage split is typical, not measured.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No published dimensions for this vehicle yet.</p>
        )}
      </div>

      <div className="space-y-5">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
          {specs.map(([label, value]) => (value ? <Fact key={label} label={label}>{value}</Fact> : null))}
        </dl>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          <Tile value={v.record.total ? String(v.record.total) : '—'} label="launches" />
          <Tile value={rate === null ? '—' : `${rate}%`} label={`success · ${v.record.failed} failed`} />
          <Tile value={v.record.streak ? String(v.record.streak) : '—'} label="in a row" />
          <Tile value={v.record.landingsAttempted ? `${v.record.landingsSuccess}/${v.record.landingsAttempted}` : '—'} label="landings" />
        </div>
      </div>

      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">{flown ? 'Flew' : 'Flying today'}</h3>
          <ul className="divide-y divide-border text-sm">
            {v.boosters.map((b, i) => (
              <li key={`${b.serial}-${i}`} className="py-2" title={b.landing?.description}>
                <span translate="no">
                  {b.type}
                  {b.serial ? ` ${b.serial}` : ''}
                </span>
                {b.flightNumber ? <span className="text-muted-foreground"> · flight {b.flightNumber}</span> : null}
                <span className="text-muted-foreground">{b.reused ? ' · flight-proven' : b.flightNumber === 1 ? ' · new' : ''}</span>
                {/* WHY: the landing plan is the most-asked question about a reusable booster; downrange distance says how hard the ascent was. */}
                <span className={b.landing?.success === false ? 'text-nogo' : 'text-muted-foreground'}>{landingText(b, flown)}</span>
              </li>
            ))}
            {inferred.source === 'name' ? (
              <li className="py-2">
                {inferred.count} × {inferred.name}
                <span className="text-muted-foreground"> · {inferred.note}</span>
              </li>
            ) : null}
            {v.spacecraft ? (
              <li className="py-2">
                <span translate="no">{v.spacecraft.name}</span>
                <span className="text-muted-foreground">
                  {v.spacecraft.config && v.spacecraft.config !== v.spacecraft.name ? ` · ${v.spacecraft.config}` : ''}
                  {v.spacecraft.crew ? ` · ${v.spacecraft.crew} crew` : ' · uncrewed'}
                  {v.spacecraft.destination ? ` · to ${v.spacecraft.destination}` : ''}
                </span>
              </li>
            ) : (
              <li className="py-2">
                Payload fairing <span className="text-muted-foreground">· shields the payload through the atmosphere, jettisoned once the air is thin</span>
              </li>
            )}
            {v.boosters.length === 0 && inferred.source === 'none' ? (
              <li className="py-2 text-muted-foreground">Per-flight stage details not published for this launch.</li>
            ) : null}
          </ul>
        </section>
        {v.description ? (
          // WHY: not a <details>: expanding it reflowed the whole panel, and a one-paragraph description needs no hiding.
          <section className="space-y-2 text-sm">
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">About {v.name}</h3>
            <p className="text-pretty break-words text-muted-foreground">{v.description}</p>
          </section>
        ) : null}
        {v.image ? (
          <figure className="space-y-1">
            <img src={v.image.url} alt={`${v.name}`} width={600} height={400} loading="lazy" className="h-40 w-full object-cover" />
            <figcaption className="text-[10px] uppercase tracking-widest text-muted-foreground">
              photo · {v.image.credit || 'unknown'}
              {v.image.license ? ` · ${v.image.license}` : ''}
            </figcaption>
          </figure>
        ) : null}
      </div>
    </Panel>
  )
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-card p-3">
      <p className="text-2xl">{value}</p>
      <p className="text-[10px] leading-tight uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </>
  )
}
