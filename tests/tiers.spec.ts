/**
 * Pure tier arithmetic suite: the effort ladder, route application (sampling
 * preservation), the effort-first escalation ladder, and the fallback
 * classification that encodes the division of labour with `dsh-llm-retry`.
 * @module dsh-autotier/tests/tiers.spec
 */

import type { LlmCallConfig } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import {
  advanceFallback,
  classifyFallback,
  effortRank,
  escalationLadder,
  fallbackActive,
  nextEffortStep,
  resolveRoute,
  routeEquals,
} from '../src/tiers.ts'

/** The adapter brands its effort ids; tests construct them from the public vocabulary. */
function effort(value: string): NonNullable<LlmCallConfig['reasoningEffort']> {
  return value as NonNullable<LlmCallConfig['reasoningEffort']>
}

describe('effort ladder', () => {
  it('ranks the adapter vocabulary', () => {
    expect(effortRank('off')).toBe(0)
    expect(effortRank('low')).toBe(1)
    expect(effortRank('high')).toBe(2)
    expect(effortRank('max')).toBe(3)
    expect(effortRank('medium')).toBe(0)
  })

  it('never steps above the ceiling and stops at max', () => {
    expect(nextEffortStep('off')).toBe('low')
    expect(nextEffortStep('low')).toBe('high')
    expect(nextEffortStep('high')).toBe('max')
    expect(nextEffortStep('max')).toBeNull()
    expect(nextEffortStep('low', 'high')).toBe('high')
    expect(nextEffortStep('high', 'high')).toBeNull()
  })
})

describe('resolveRoute', () => {
  const base: LlmCallConfig = {
    provider: 'deepseek-official',
    model: 'deepseek-v4-flash',
    reasoningEffort: effort('low'),
    temperature: 0.3,
    maxTokens: 4096,
    stop: ['</done>'],
  }

  it('returns the same object when the landing already matches', () => {
    const same = resolveRoute(base, { provider: 'deepseek-official', model: 'deepseek-v4-flash', effort: 'low' })
    expect(same).toBe(base)
  })

  it('preserves exactly the sampling scalars on a model switch', () => {
    const next = resolveRoute(base, { provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high' })
    expect(next).toEqual({
      provider: 'deepseek-official',
      model: 'deepseek-v4-pro',
      reasoningEffort: 'high',
      temperature: 0.3,
      maxTokens: 4096,
      stop: ['</done>'],
    })
  })

  it('changes effort only when the model is shared', () => {
    const next = resolveRoute(base, { provider: 'deepseek-official', model: 'deepseek-v4-flash', effort: 'high' })
    expect(next.model).toBe('deepseek-v4-flash')
    expect(next.reasoningEffort).toBe('high')
    expect(next.temperature).toBe(0.3)
  })

  it('followSession carries the request effort instead of dropping it', () => {
    const withEffort = resolveRoute(base, { provider: 'deepseek-official', model: 'deepseek-v4-pro' })
    expect(withEffort.reasoningEffort).toBe('low')
    const withoutEffort = resolveRoute(
      { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
      { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
    )
    expect('reasoningEffort' in withoutEffort).toBe(false)
  })

  it('routeEquals compares the full triple', () => {
    expect(routeEquals({ provider: 'a', model: 'b', effort: 'low' }, { provider: 'a', model: 'b', effort: 'low' })).toBe(true)
    expect(routeEquals({ provider: 'a', model: 'b', effort: 'low' }, { provider: 'a', model: 'b', effort: 'high' })).toBe(false)
    expect(routeEquals({ provider: 'a', model: 'b' }, { provider: 'a', model: 'b', effort: 'low' })).toBe(false)
  })
})

describe('escalation ladder', () => {
  const cheap = { provider: 'deepseek-official', model: 'deepseek-v4-flash', effort: 'low' as const }
  const strong = { provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high' as const }

  it('walks the cheap model effort up before switching models', () => {
    const rungs = escalationLadder({ provider: 'deepseek-official', model: 'deepseek-v4-flash', reasoningEffort: effort('low') }, cheap, strong)
    expect(rungs.map(rung => `${rung.tier}:${rung.route.effort}`)).toEqual(['cheap:high', 'cheap:max', 'strong:high'])
    expect(rungs.at(-1)?.route.model).toBe('deepseek-v4-pro')
  })

  it('collapses to one effort-only rung when both tiers share a model', () => {
    const shared = { provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'max' as const }
    const rungs = escalationLadder(
      { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: effort('low') },
      { ...shared, effort: 'low' as const },
      shared,
    )
    expect(rungs).toHaveLength(1)
    expect(rungs[0]?.tier).toBe('strong')
    expect(rungs[0]?.route.effort).toBe('max')
  })

  it('does not offer an effort rung when the base is not on the cheap model', () => {
    const rungs = escalationLadder({ provider: 'other', model: 'x', reasoningEffort: effort('low') }, cheap, strong)
    expect(rungs).toHaveLength(1)
    expect(rungs[0]?.tier).toBe('strong')
  })
})

describe('fallback classification', () => {
  it('classifies permanent, transient and ignore codes', () => {
    expect(classifyFallback({ code: 'UNKNOWN_MODEL' })).toBe('permanent')
    expect(classifyFallback({ code: 'MISSING_CREDENTIAL' })).toBe('permanent')
    expect(classifyFallback({ code: 'QUOTA' })).toBe('permanent')
    expect(classifyFallback({ code: 'RATE_LIMIT' })).toBe('transient')
    expect(classifyFallback({ code: 'SERVER' })).toBe('transient')
    expect(classifyFallback({ code: 'CONTEXT_WINDOW_EXCEEDED' })).toBe('ignore')
    expect(classifyFallback({ code: 'UNSUPPORTED_REASONING_EFFORT' })).toBe('ignore')
    expect(classifyFallback({ code: 'ABORTED' })).toBe('ignore')
  })

  it('treats an unknown shape with a 5xx status as transient', () => {
    expect(classifyFallback({ status: 503 })).toBe('transient')
    expect(classifyFallback({ status: 400 })).toBe('unknown')
    expect(classifyFallback(undefined)).toBe('unknown')
  })
})

describe('fallback records', () => {
  it('advances through the chain and stops when exhausted', () => {
    const now = 1_000
    expect(fallbackActive(undefined, now)).toBe(false)
    const first = advanceFallback(undefined, 'cheap', 2, now, 5_000)
    expect(first).toEqual({ tier: 'cheap', index: 0, until: 6_000 })
    expect(fallbackActive(first!, now)).toBe(true)
    const second = advanceFallback(first!, 'cheap', 2, now, 5_000)
    expect(second).toEqual({ tier: 'cheap', index: 1, until: 6_000 })
    expect(advanceFallback(second!, 'cheap', 2, now, 5_000)).toBeNull()
  })

  it('restarts the chain when the tier changes', () => {
    const now = 1_000
    const cheapRecord = advanceFallback(undefined, 'cheap', 3, now, 5_000)
    expect(cheapRecord?.index).toBe(0)
    // A record from another tier must not be read as a position in this chain.
    expect(advanceFallback(cheapRecord!, 'strong', 3, now, 5_000)).toEqual({ tier: 'strong', index: 0, until: 6_000 })
  })

  it('is inactive once the TTL expires', () => {
    expect(fallbackActive({ tier: 'cheap', index: 0, until: 999 }, 1_000)).toBe(false)
  })
})
