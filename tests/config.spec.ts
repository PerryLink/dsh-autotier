/**
 * Config schema + explicit-resolve suite. The schema is what the Loader and the
 * settings UI see; `resolveConfig` is the runtime judge that re-checks every
 * default and cross-field requirement, so both are asserted here — including
 * the adapter-owned effort vocabulary that makes a misconfiguration dead rather
 * than merely suboptimal.
 * @module dsh-autotier/tests/config.spec
 */

import { describe, expect, it } from 'vitest'
import { Config, resolveConfig, validateConfig } from '../src/index.ts'

describe('Config schema', () => {
  it('resolves the documented defaults for a bare row', () => {
    const resolved = Config({})
    expect(resolved.tiers?.strong).toEqual({
      provider: 'deepseek-official',
      model: 'deepseek-v4-pro',
      effort: 'high',
      followSession: false,
      fallback: [],
    })
    expect(resolved.tiers?.cheap).toEqual({
      provider: 'deepseek-official',
      model: 'deepseek-v4-flash',
      effort: 'low',
      followSession: true,
      fallback: [],
    })
    expect(resolved.tiers?.vision).toEqual({
      provider: 'deepseek-official',
      model: 'deepseek-v4-flash-vision-exp',
    })
    expect(resolved.routingMode).toBe('auto')
    expect(resolved.guard?.tiers).toEqual(['cheap'])
    expect(resolved.escalation).toEqual({
      threshold: 2,
      windowMs: 60_000,
      ttlMs: 180_000,
      fallbackTtlMs: 300_000,
      signature: true,
    })
  })

  it('accepts only the adapter-owned effort vocabulary', () => {
    expect(Config({ tiers: { strong: { effort: 'max' } } }).tiers?.strong?.effort).toBe('max')
    // The casts are deliberate: these literals are rejected by the TYPE, and the
    // test asserts that the RUNTIME schema rejects them too (a cordis.yml is
    // untyped, so only the runtime guard protects a user).
    expect(() => Config({ tiers: { strong: { effort: 'medium' } } } as never)).toThrow()
    expect(() => Config({ tiers: { cheap: { effort: 'HIGH' } } } as never)).toThrow()
  })

  it('rejects an out-of-range ruleThreshold through the schema', () => {
    expect(() => Config({ intent: { ruleThreshold: 1.5 } })).toThrow()
    expect(() => Config({ intent: { ruleThreshold: 0 } })).toThrow()
  })

  it('rejects an unknown routing mode', () => {
    expect(() => Config({ routingMode: 'auto-magic' } as never)).toThrow()
  })
})

describe('resolveConfig', () => {
  it('is idempotent over its own output', () => {
    const once = resolveConfig(undefined)
    const twice = resolveConfig(once)
    expect(twice).toEqual(once)
  })

  it('fails loud when strong and cheap land on the same tier', () => {
    expect(() => resolveConfig({ tiers: { cheap: { provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high' } } }))
      .toThrow(/strong and cheap resolve to the same landing/u)
  })

  it('allows the same model on both tiers when the effort differs', () => {
    const resolved = resolveConfig({
      tiers: {
        strong: { provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'max' },
        cheap: { provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'low' },
      },
    })
    expect(resolved.tiers.strong.effort).toBe('max')
    expect(resolved.tiers.cheap.effort).toBe('low')
  })

  it('rejects a self-referential or duplicated fallback chain', () => {
    expect(() => resolveConfig({ tiers: { strong: { fallback: [{ provider: 'deepseek-official', model: 'deepseek-v4-pro' }] } } }))
      .toThrow(/duplicates the tier landing/u)
    expect(() => resolveConfig({
      tiers: {
        cheap: {
          fallback: [
            { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
            { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
          ],
        },
      },
    })).toThrow(/duplicates the tier landing or an earlier fallback/u)
  })

  it('rejects a blank fallback landing', () => {
    expect(() => resolveConfig({ tiers: { cheap: { fallback: [{ provider: 'deepseek-official', model: '  ' }] } } }))
      .toThrow(/tiers\.cheap\.fallback\[0\]\.model/u)
  })

  it('rejects an attempt band at or above the decision threshold', () => {
    expect(() => resolveConfig({ intent: { ruleThreshold: 0.5, attemptBand: { enabled: true, tauLow: 0.5 } } }))
      .toThrow(/intent\.attemptBand\.tauLow/u)
  })

  it('rejects a hysteresis pair that cannot stop flapping', () => {
    expect(() => resolveConfig({ intent: { hysteresis: { toStrong: 0.5, toCheap: 0.5 } } }))
      .toThrow(/intent\.hysteresis/u)
  })

  it('rejects malformed declarative rules', () => {
    expect(() => resolveConfig({ intent: { rules: [{ id: 'a', when: { patterns: ['('] }, tier: 'strong', priority: 1 }] } }))
      .toThrow(/is not a valid regular expression/u)
    expect(() => resolveConfig({ intent: { rules: [{ id: 'a', when: { patterns: [], tools: [] }, priority: 1 }] } }))
      .toThrow(/must declare at least one pattern or tool/u)
    expect(() => resolveConfig({
      intent: {
        rules: [
          { id: 'dup', when: { patterns: ['x'] }, priority: 1 },
          { id: 'dup', when: { patterns: ['y'] }, priority: 2 },
        ],
      },
    })).toThrow(/duplicates rule id/u)
  })

  it('accepts a well-formed rule table and preserves priority order', () => {
    const resolved = resolveConfig({
      intent: {
        rules: [
          { id: 'plan', when: { patterns: ['^plan\\b', 'design'], tools: [] }, tier: 'strong', priority: 10 },
          { id: 'lint', when: { patterns: [], tools: ['read_file'] }, tier: 'cheap', priority: 1 },
        ],
      },
    })
    expect(resolved.intent.rules.map(rule => rule.id)).toEqual(['plan', 'lint'])
    expect(resolved.intent.rules[0]?.tier).toBe('strong')
    expect(resolved.intent.rules[1]?.when.tools).toEqual(['read_file'])
  })

  it('rejects a blank landing and a zero escalation threshold', () => {
    expect(() => resolveConfig({ tiers: { strong: { model: '   ' } } })).toThrow(/tiers\.strong\.model/u)
    expect(() => resolveConfig({ escalation: { threshold: 0 } })).toThrow(/escalation\.threshold/u)
  })

  it('rejects a blank protected path or whitelist entry', () => {
    expect(() => resolveConfig({ guard: { protectedPaths: [''] } })).toThrow(/guard\.protectedPaths\[0\]/u)
    expect(() => resolveConfig({ guard: { whitelist: ['  '] } })).toThrow(/guard\.whitelist\[0\]/u)
  })

  it('freezes the resolved tree', () => {
    const resolved = resolveConfig(undefined)
    expect(Object.isFrozen(resolved)).toBe(true)
    expect(Object.isFrozen(resolved.tiers.strong)).toBe(true)
    expect(Object.isFrozen(resolved.intent.rules)).toBe(true)
  })

  it('validateConfig is the same judgement as resolveConfig', () => {
    expect(() => { validateConfig({ escalation: { threshold: 0 } }) }).toThrow(/escalation\.threshold/u)
    expect(() => { validateConfig({ routingMode: 'off' }) }).not.toThrow()
  })
})
