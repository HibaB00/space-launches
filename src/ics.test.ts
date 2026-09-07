import { describe, expect, test } from 'bun:test'
import fixture from './fixtures/upcoming.json'
import { feedIcs, googleCalendarUrl, googleSubscribeUrl, launchIcs } from './ics'
import { toLaunch, type LL2Launch } from './launches'

const launches = (fixture.results as unknown as LL2Launch[]).map(toLaunch)
const STAMP = '2026-09-07T20:00:00.000Z'
// WHY: RFC 5545 folds long lines at 75 octets; unfold before asserting on content.
const unfold = (ics: string) => ics.replace(/\r\n /g, '')

describe('ics', () => {
  test('a timed launch gets a UTC start, an end and a 15-minute alarm', () => {
    const raw = launchIcs(launches[0], STAMP)
    expect(raw.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    const ics = unfold(raw)
    expect(ics).toContain('UID:d793ba47-faf5-4bab-a386-39a9ccc49c90@space-launches')
    expect(ics).toContain('DTSTART:20260909T161503Z')
    expect(ics).toContain('DTEND:20260909T171503Z') // instantaneous window → +1 h
    expect(ics).toContain('TRIGGER:-PT15M')
    expect(ics).toContain('LOCATION:31/6\\, Baikonur Cosmodrome\\, Republic of Kazakhstan')
    expect(ics).toContain('URL:https://hibab00.github.io/space-launches/launch/d793ba47-faf5-4bab-a386-39a9ccc49c90')
    expect(ics).toContain('Watch live: https://plus.nasa.gov/')
  })
  test('a month-precision NET becomes an all-day event without an alarm', () => {
    const crew = launches.find((l) => l.mission.name === 'Crew-13')!
    const ics = launchIcs(crew, STAMP)
    expect(ics).toContain('DTSTART;VALUE=DATE:20260930')
    expect(ics).not.toContain('VALARM')
    expect(ics).toContain('· NET Sep 2026')
  })
  test('escapes semicolons, commas and newlines in text fields', () => {
    const l = { ...launches[0], mission: { ...launches[0].mission, name: 'A; B, C', description: 'line one\nline two' } }
    const ics = launchIcs(l, STAMP)
    expect(ics).toContain('SUMMARY:🚀 Soyuz 2.1b · A\\; B\\, C (RFSA)')
    expect(ics).toContain('DESCRIPTION:line one\\nline two')
  })
  test('Google Calendar link carries the same event', () => {
    const url = new URL(googleCalendarUrl(launches[0], STAMP))
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('dates')).toBe('20260909T161503Z/20260909T171503Z')
    expect(url.searchParams.get('text')).toBe('🚀 Soyuz 2.1b · Progress MS-35 (96P) (RFSA)')
    expect(url.searchParams.get('details')).toContain('Watch live: https://plus.nasa.gov/')
    expect(url.searchParams.get('details')).toContain('Details & countdown: https://hibab00.github.io/space-launches/launch/')
    expect(url.searchParams.get('details')).toContain('From: 31/6, Baikonur Cosmodrome, Kazakhstan')
    expect(googleSubscribeUrl()).toBe('https://calendar.google.com/calendar/r?cid=https%3A%2F%2Fhibab00.github.io%2Fspace-launches%2Flaunches.ics')
    const crew = launches.find((l) => l.mission.name === 'Crew-13')!
    expect(new URL(googleCalendarUrl(crew, STAMP)).searchParams.get('dates')).toBe('20260930/20261001')
  })
  test('lines are folded at 75 octets with CRLF', () => {
    const ics = feedIcs(launches, STAMP)
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(20)
    expect(ics).not.toContain('\n\n')
  })
})
