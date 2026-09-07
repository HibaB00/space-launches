import { describe, expect, test } from 'bun:test'
import fixture from './fixtures/upcoming.json'
import { feedIcs, launchIcs } from './ics'
import { toLaunch, type LL2Launch } from './launches'

const launches = (fixture.results as unknown as LL2Launch[]).map(toLaunch)
const STAMP = '2026-09-07T20:00:00.000Z'

describe('ics', () => {
  test('a timed launch gets a UTC start, an end and a 15-minute alarm', () => {
    const ics = launchIcs(launches[0], STAMP)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('UID:d793ba47-faf5-4bab-a386-39a9ccc49c90@space-launches')
    expect(ics).toContain('DTSTART:20260909T161503Z')
    expect(ics).toContain('DTEND:20260909T171503Z') // instantaneous window → +1 h
    expect(ics).toContain('TRIGGER:-PT15M')
    expect(ics).toContain('LOCATION:31/6\\, Baikonur Cosmodrome\\, Republic of Kazakhstan')
    expect(ics).toContain('URL:https://plus.nasa.gov/')
  })
  test('a month-precision NET becomes an all-day event without an alarm', () => {
    const crew = launches.find((l) => l.mission.name === 'Crew-13')!
    const ics = launchIcs(crew, STAMP)
    expect(ics).toContain('DTSTART;VALUE=DATE:20260930')
    expect(ics).not.toContain('VALARM')
    expect(ics).toContain('(NET Sep 2026)')
  })
  test('escapes semicolons, commas and newlines in text fields', () => {
    const l = { ...launches[0], mission: { ...launches[0].mission, name: 'A; B, C', description: 'line one\nline two' } }
    const ics = launchIcs(l, STAMP)
    expect(ics).toContain('SUMMARY:Soyuz 2.1b · A\\; B\\, C')
    expect(ics).toContain('DESCRIPTION:line one\\nline two')
  })
  test('lines are folded at 75 octets with CRLF', () => {
    const ics = feedIcs(launches, STAMP)
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(20)
    expect(ics).not.toContain('\n\n')
  })
})
