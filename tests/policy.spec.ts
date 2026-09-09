/**
 * Decision-state-machine suite: precedence between overrides, escalation, plan
 * mode, rules, posteriors and the classifier; the double-threshold hysteresis;
 * the judge's cooldown/abstain logic; and the same-signature escalation counter.
 * @module dsh-autotier/tests/policy.spec
 */

import { describe, expect, it } from 'vitest'
import { resolveConfig, type ResolvedConfig } from '../src/config.ts'
import type { IntentResult } from '../src/intent.ts'
import { PosteriorTable } from '../src/intent.ts'
import {
  attemptBandApplies,
  createRouteState,
  decideTier,
  escalationActive,
  judgeNeeded,
  noteFailure,
  noteFallback,
} from '../src/policy.ts'
import type { TierId } from '../src/types.ts'

/** A synthetic classification. */
function intent(tier: TierId, confidence: number, fingerprint = 'coding|0|0'): IntentResult {
  return {
    scenario: 'coding',
    tier,
    confidence,
    keywordScore: 1,
    signals: {
      chars: 10,
      estTokens: 3,
      tokenBands: 0,
      fences: 0,
      toolCalls: 0,
      messageCount: 0,
      hardHints: 0,
      score: 0,
    },
    reasons: ['test fixture'],
    shortCircuit: undefined,
    fingerprint,
  }
}

/** Decide with sensible defaults. */
function decide(overrides: {
  config?: ResolvedConfig
  state?: ReturnType<typeof createRouteState>
  classification?: IntentResult
  rule?: { id: string; tier: 'cheap' | 'strong' } | null
  posteriors?: PosteriorTable
  override?: ReturnType<typeof createRouteState>['override']
  now?: number
}) {
  const state = overrides.state ?? createRouteState()
  return decideTier({
    config: overrides.config ?? resolveConfig(undefined),
    state,
    intent: overrides.classification ?? intent('cheap', 0.9),
    rule: overrides.rule ?? null,
    posteriors: overrides.posteriors ?? new PosteriorTable(),
    override: overrides.override,
    now: overrides.now ?? 1_000,
  })
}

describe('decideTier precedence', () => {
  it('honours an explicit override above everything else', () => {
    const state = createRouteState()
    state.planActive = true
    expect(decide({ state, override: 'cheap' }).source).toBe('manual')
    expect(decide({ state, override: 'cheap' }).tier).toBe('cheap')
  })

  it('honours an active escalation above plan mode and rules', () => {
    const state = createRouteState()
    state.planActive = true
    state.escalation = { count: 2, signature: 'SERVER|', until: 2_000, rung: 1 }
    const decision = decide({ state, rule: { id: 'x', tier: 'cheap' } })
    expect(decision.tier).toBe('strong')
    expect(decision.source).toBe('escalation')
  })

  it('honours plan mode above rules', () => {
    const state = createRouteState()
    state.planActive = true
    const decision = decide({ state, rule: { id: 'x', tier: 'cheap' } })
    expect(decision.tier).toBe('strong')
    expect(decision.source).toBe('plan-mode')
  })

  it('honours a rule above the classifier', () => {
    const decision = decide({ rule: { id: 'deploy', tier: 'strong' } })
    expect(decision.tier).toBe('strong')
    expect(decision.source).toBe('rule')
    expect(decision.reason).toContain('deploy')
  })

  it('honours a posterior verdict above the classifier', () => {
    const posteriors = new PosteriorTable({ coldStart: 2, epsilon: 0 })
    for (let index = 0; index < 4; index += 1) posteriors.record('coding|0|0', 'cheap', index < 1, index)
    const decision = decide({ posteriors, classification: intent('cheap', 0.95) })
    expect(decision.tier).toBe('strong')
    expect(decision.source).toBe('posterior')
  })

  it('falls through to the classifier verdict', () => {
    const decision = decide({ classification: intent('strong', 0.95) })
    expect(decision.tier).toBe('strong')
    expect(decision.source).toBe('judge')
  })
})

describe('hysteresis', () => {
  it('does not switch cheap -> strong below toStrong', () => {
    const state = createRouteState()
    state.appliedTier = 'cheap'
    const decision = decide({ state, classification: intent('strong', 0.7) })
    expect(decision.tier).toBe('cheap')
    expect(decision.reason).toContain('hysteresis')
  })

  it('switches cheap -> strong at or above toStrong', () => {
    const state = createRouteState()
    state.appliedTier = 'cheap'
    expect(decide({ state, classification: intent('strong', 0.8) }).tier).toBe('strong')
  })

  it('does not switch strong -> cheap at or above toCheap', () => {
    const state = createRouteState()
    state.appliedTier = 'strong'
    const decision = decide({ state, classification: intent('cheap', 0.65) })
    expect(decision.tier).toBe('strong')
  })

  it('switches strong -> cheap below toCheap', () => {
    const state = createRouteState()
    state.appliedTier = 'strong'
    expect(decide({ state, classification: intent('cheap', 0.59) }).tier).toBe('cheap')
  })

  it('damps a flapping signal across turns', () => {
    const state = createRouteState()
    state.appliedTier = 'cheap'
    // 0.75 < toStrong: stays cheap; 0.65 >= toCheap: still stays cheap.
    for (const confidence of [0.75, 0.65, 0.72, 0.61]) {
      decide({ state, classification: intent('strong', confidence) })
    }
    expect(state.appliedTier).toBe('cheap')
  })
})

describe('judge gating', () => {
  const config = resolveConfig(undefined)

  it('asks only below the rule threshold', () => {
    const state = createRouteState()
    const now = config.intent.judge.cooldownMs
    expect(judgeNeeded(config, state, intent('cheap', 0.69), null, now)).toBe(true)
    expect(judgeNeeded(config, state, intent('cheap', 0.7), null, now)).toBe(false)
  })

  it('never asks when a rule or a short-circuit decided', () => {
    const state = createRouteState()
    const now = config.intent.judge.cooldownMs
    expect(judgeNeeded(config, state, intent('cheap', 0.1), { id: 'x', tier: 'cheap' }, now)).toBe(false)
    const short = { ...intent('cheap', 0.1), shortCircuit: 'greeting' as const }
    expect(judgeNeeded(config, state, short, null, now)).toBe(false)
  })

  it('honours the cooldown', () => {
    const state = createRouteState()
    state.judge.lastCall = 1_000
    expect(judgeNeeded(config, state, intent('cheap', 0.1), null, 1_000 + config.intent.judge.cooldownMs - 1)).toBe(false)
    expect(judgeNeeded(config, state, intent('cheap', 0.1), null, 1_000 + config.intent.judge.cooldownMs)).toBe(true)
  })

  it('stops asking after the configured consecutive failures', () => {
    const state = createRouteState()
    state.judge.failures = config.intent.judge.unavailableSkip
    expect(judgeNeeded(config, state, intent('cheap', 0.1), null, 1_000_000)).toBe(false)
  })

  it('applies the attempt band only inside [tauLow, ruleThreshold)', () => {
    const band = resolveConfig({ intent: { attemptBand: { enabled: true, tauLow: 0.45 } } })
    expect(attemptBandApplies(band, intent('cheap', 0.44))).toBe(false)
    expect(attemptBandApplies(band, intent('cheap', 0.45))).toBe(true)
    expect(attemptBandApplies(band, intent('cheap', 0.69))).toBe(true)
    expect(attemptBandApplies(band, intent('cheap', 0.7))).toBe(false)
    expect(attemptBandApplies(resolveConfig(undefined), intent('cheap', 0.5))).toBe(false)
  })
})

describe('escalation counter', () => {
  const config = resolveConfig({ escalation: { threshold: 2, windowMs: 60_000, ttlMs: 180_000 } })

  it('escalates on the second same-signature failure', () => {
    const state = createRouteState()
    expect(noteFailure(state, 'SERVER|coding|0|0', config, 1_000)).toBe(false)
    expect(noteFailure(state, 'SERVER|coding|0|0', config, 1_001)).toBe(true)
    expect(escalationActive(state, 1_001)).toBe(true)
  })

  it('does not accumulate different signatures', () => {
    const state = createRouteState()
    noteFailure(state, 'SERVER|a', config, 1_000)
    expect(noteFailure(state, 'SERVER|b', config, 1_001)).toBe(false)
    expect(state.escalation?.count).toBe(1)
  })

  it('resets the count outside the window', () => {
    const state = createRouteState()
    noteFailure(state, 'SERVER|a', config, 1_000)
    expect(noteFailure(state, 'SERVER|a', config, 1_000 + config.escalation.windowMs + 1)).toBe(false)
    expect(state.escalation?.count).toBe(1)
  })

  it('expires after the TTL', () => {
    const state = createRouteState()
    noteFailure(state, 'SERVER|a', config, 1_000)
    noteFailure(state, 'SERVER|a', config, 1_001)
    expect(escalationActive(state, 1_001 + config.escalation.ttlMs - 1)).toBe(true)
    expect(escalationActive(state, 1_001 + config.escalation.ttlMs)).toBe(false)
  })

  it('counts every failure when signature matching is off', () => {
    const loose = resolveConfig({ escalation: { threshold: 2, signature: false } })
    const state = createRouteState()
    noteFailure(state, 'A|1', loose, 1_000)
    expect(noteFailure(state, 'B|2', loose, 1_001)).toBe(true)
  })
})

describe('fallback bookkeeping', () => {
  it('advances and then reports exhaustion', () => {
    const config = resolveConfig(undefined)
    const state = createRouteState()
    expect(noteFallback(state, 1, config, 1_000)).toBe(true)
    expect(state.fallback?.index).toBe(0)
    expect(noteFallback(state, 1, config, 1_000)).toBe(false)
    expect(state.fallback).toBeUndefined()
  })
})
