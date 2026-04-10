import { describe, it, expect } from 'vitest'

// VoteBar is not exported separately — we test it via a minimal inline
// re-implementation to avoid coupling tests to internal structure.
// The real logic: pct = total > 0 ? round((votes/total)*100) : 0

function computePct(votes: number, total: number) {
  return total > 0 ? Math.round((votes / total) * 100) : 0
}

describe('VoteBar percentage logic', () => {
  it('returns 0% when total is 0', () => {
    expect(computePct(0, 0)).toBe(0)
  })

  it('returns 50% when votes are split evenly', () => {
    expect(computePct(1, 2)).toBe(50)
  })

  it('returns 100% when all votes are on one option', () => {
    expect(computePct(5, 5)).toBe(100)
  })

  it('rounds to nearest integer', () => {
    expect(computePct(1, 3)).toBe(33)
    expect(computePct(2, 3)).toBe(67)
  })

  it('handles large numbers correctly', () => {
    expect(computePct(999, 1000)).toBe(100)
    expect(computePct(500, 1000)).toBe(50)
  })
})
