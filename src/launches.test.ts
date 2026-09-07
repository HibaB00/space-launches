import { describe, expect, test } from 'bun:test'
import fixture from './fixtures/upcoming.json'
import {
  siteName,
  youtubeEmbedUrl,
  countdownText,
  countdownMode,
  formatCountdown,
  formatNet,
  toLaunch,
  type LL2Launch,
  type Launch,
} from './launches'

// WHY: one real API response instead of hand-written mocks; it catches shape surprises
// (null map_url, "Details TBD." descriptions, month-precision NETs) that mocks never contain.
const raws = fixture.results as unknown as LL2Launch[]
const launches = raws.map(toLaunch)
const byName = (s: string) => launches.find((l) => l.name.includes(s))!

const HOUR = 3_600_000
const DAY = 24 * HOUR

describe('toLaunch', () => {
  test('maps all 20 fixture records without throwing', () => {
    expect(launches).toHaveLength(20)
    for (const l of launches) {
      expect(l.id).toBeTruthy()
      expect(Number.isNaN(Date.parse(l.net))).toBe(false)
      expect(l.pad.mapUrl).toMatch(/^https:\/\//)
    }
  })

  test('maps a fully populated Go launch', () => {
    const l = byName('Progress MS-35')
    expect(l.rocket).toBe('Soyuz 2.1b')
    expect(l.providerAbbrev).toBe('RFSA')
    expect(l.status.abbrev).toBe('Go')
    expect(l.netPrecision).toBe('SEC')
    expect(l.mission.type).toBe('Resupply')
    expect(l.mission.orbitAbbrev).toBe('LEO')
    expect(l.pad.location).toContain('Baikonur')
    expect(l.pad.country).toBe('Kazakhstan')
    expect(l.pad.timezone).toBe('Asia/Qyzylorda')
    expect(l.pad.lat).toBeCloseTo(45.996, 2)
    // WHY: two streams exist (YouTube priority 10, NASA+ priority 12); the highest priority wins.
    expect(l.webcast).toBe('https://plus.nasa.gov/scheduled-video/progress-96-cargo-ship-launch/')
    expect(l.image?.url).toMatch(/^https:\/\//)
    expect(l.image?.thumb).toMatch(/thumbnail/)
    expect(l.image?.credit).toBe('Roscosmos')
    expect(l.image?.license).toBe('Roscosmos Image Use Policy')
  })

  test('takes the highest-priority mission patch when there is one', () => {
    const raw = raws.find((r) => r.mission_patches && r.mission_patches.length > 0)!
    expect(toLaunch(raw).patch).toMatch(/^https:\/\/.*mission_patch/)
    expect(toLaunch({ ...raw, mission_patches: null }).patch).toBeNull()
  })

  test('builds a map URL from coordinates when the API has none', () => {
    const raw = raws.find((r) => r.pad.map_url === null)!
    const l = toLaunch(raw)
    expect(l.pad.mapUrl).toBe(`https://www.google.com/maps?q=${raw.pad.latitude},${raw.pad.longitude}`)
  })

  test('degrades gracefully when mission, precision and media are missing', () => {
    const raw = { ...raws[0], mission: null, net_precision: null, image: null, mission_patches: [], vid_urls: [], info_urls: [] }
    const l = toLaunch(raw)
    expect(l.mission).toEqual({ name: 'Unknown payload', description: '', type: 'Unknown', orbit: 'Unknown', orbitAbbrev: '' })
    expect(l.netPrecision).toBe('')
    expect(l.image).toBeNull()
    expect(l.webcast).toBeNull()
    expect(l.infoUrl).toBeNull()
  })
})

describe('countdownMode', () => {
  const at = (net: string, netPrecision: string, status = 'Go'): Launch => ({
    ...launches[0],
    net,
    netPrecision,
    status: { ...launches[0].status, abbrev: status },
  })
  const now = Date.parse('2026-09-07T12:00:00Z')

  test('ticks when the time is known to the hour or finer and is in the future', () => {
    for (const p of ['SEC', 'MIN', 'HR']) expect(countdownMode(at('2026-09-08T12:00:00Z', p), now)).toBe('tick')
  })
  test('counts T+ once a fine-precision NET has passed', () => {
    expect(countdownMode(at('2026-09-07T11:59:00Z', 'SEC'), now)).toBe('tplus')
  })
  test('shows a NET date when precision is a day or coarser, whatever the status', () => {
    for (const p of ['DAY', 'WK', 'M', 'Q3', 'H2', 'Y']) {
      expect(countdownMode(at('2026-10-07T00:00:00Z', p), now)).toBe('net-date')
      expect(countdownMode(at('2026-10-07T00:00:00Z', p, 'TBD'), now)).toBe('net-date')
    }
  })
  test('hold wins over everything', () => {
    expect(countdownMode(at('2026-09-08T12:00:00Z', 'SEC', 'Hold'), now)).toBe('hold')
  })
  test('every precision in the real fixture maps to a mode', () => {
    for (const l of launches) expect(['tick', 'tplus', 'net-date', 'hold']).toContain(countdownMode(l, now))
  })
})

describe('formatCountdown', () => {
  test('is fixed width with two-digit fields', () => {
    expect(formatCountdown(0)).toBe('T-00d 00h 00m 00s')
    expect(formatCountdown(2 * DAY + 4 * HOUR + 17 * 60_000 + 33_000)).toBe('T-02d 04h 17m 33s')
  })
  test('rolls over at each field boundary', () => {
    expect(formatCountdown(DAY - 1)).toBe('T-00d 23h 59m 59s')
    expect(formatCountdown(DAY)).toBe('T-01d 00h 00m 00s')
    expect(formatCountdown(HOUR)).toBe('T-00d 01h 00m 00s')
  })
  test('counts up with T+ for negative remaining time', () => {
    expect(formatCountdown(-69_000)).toBe('T+00d 00h 01m 09s')
  })
  test('lets days grow past two digits instead of truncating', () => {
    expect(formatCountdown(120 * DAY)).toBe('T-120d 00h 00m 00s')
  })
})

describe('formatNet', () => {
  const l = (net: string, netPrecision: string): Launch => ({ ...launches[0], net, netPrecision })
  test('renders by precision, in UTC so a 00:00Z date is not shifted to the day before', () => {
    expect(formatNet(l('2026-10-07T00:00:00Z', 'DAY'))).toBe('NET 7 Oct 2026')
    expect(formatNet(l('2026-10-07T00:00:00Z', 'WK'))).toBe('NET week of 7 Oct 2026')
    expect(formatNet(l('2026-09-30T00:00:00Z', 'M'))).toBe('NET Sep 2026')
    expect(formatNet(l('2026-09-30T00:00:00Z', 'Q3'))).toBe('NET Q3 2026')
    expect(formatNet(l('2026-12-31T00:00:00Z', 'H2'))).toBe('NET H2 2026')
    expect(formatNet(l('2026-12-31T00:00:00Z', 'Y'))).toBe('NET 2026')
  })
  test('falls back to the full date for unknown precision', () => {
    expect(formatNet(l('2026-10-07T00:00:00Z', ''))).toBe('NET 7 Oct 2026')
  })
})

describe('countdownText', () => {
  const now = Date.parse('2026-09-07T12:00:00Z')
  const l = (net: string, netPrecision: string, status = 'Go'): Launch => ({
    ...launches[0],
    net,
    netPrecision,
    status: { ...launches[0].status, abbrev: status },
  })
  test('picks the representation for the mode', () => {
    expect(countdownText(l('2026-09-07T13:01:05Z', 'MIN'), now)).toBe('T-00d 01h 01m 05s')
    expect(countdownText(l('2026-09-07T11:59:00Z', 'SEC'), now)).toBe('T+00d 00h 01m 00s')
    expect(countdownText(l('2026-09-30T00:00:00Z', 'M'), now)).toBe('NET Sep 2026')
    expect(countdownText(l('2026-09-08T00:00:00Z', 'SEC', 'Hold'), now)).toBe('HOLD')
  })
})

describe('siteName / youtubeEmbedUrl', () => {
  test('site name is the part before the first comma', () => {
    expect(siteName(byName('Progress MS-35'))).toBe('Baikonur Cosmodrome')
  })
  test('recognises the YouTube URL shapes and nothing else', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=1')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(youtubeEmbedUrl('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(youtubeEmbedUrl('https://plus.nasa.gov/scheduled-video/x/')).toBeNull()
    expect(youtubeEmbedUrl(null)).toBeNull()
  })
})
