import { describe, expect, test } from 'bun:test'
import { mergeArchive } from './archive'
import { isFlown, type Launch } from './launches'

const l = (id: string, net: string, abbrev = 'Success') => ({ id, net, status: { abbrev, name: '', description: '' } }) as Launch

describe('mergeArchive', () => {
  test('upserts by id, newer record wins, newest liftoff first, nothing dropped', () => {
    const existing = [l('a', '2026-10-01T00:00:00Z'), l('b', '2026-10-02T00:00:00Z')]
    const incoming = [l('b', '2026-10-02T00:00:00Z', 'Failure'), l('c', '2026-10-03T00:00:00Z')]
    const out = mergeArchive(existing, incoming)
    expect(out.map((x) => x.id)).toEqual(['c', 'b', 'a'])
    expect(out[1]!.status.abbrev).toBe('Failure')
  })
})

describe('isFlown', () => {
  test('terminal statuses only', () => {
    expect(isFlown(l('x', '', 'Success'))).toBe(true)
    expect(isFlown(l('x', '', 'Partial Failure'))).toBe(true)
    expect(isFlown(l('x', '', 'Go'))).toBe(false)
    expect(isFlown(l('x', '', 'In Flight'))).toBe(false)
  })
})
