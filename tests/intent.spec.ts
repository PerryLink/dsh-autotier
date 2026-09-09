/**
 * Deterministic intent-layer suite: the scenario matrix, the explicit-intent
 * short-circuits, the structural signal bands, the declarative rule table and
 * the fingerprint posteriors (Wilson bound, cold start, exploration, decay,
 * LRU eviction).
 * @module dsh-autotier/tests/intent.spec
 */

import { describe, expect, it } from 'vitest'
import { resolveConfig, type ResolvedConfig } from '../src/config.ts'
import {
  classifyIntent,
  compileRules,
  computeSignals,
  evaluateRules,
  fingerprintOf,
  PosteriorTable,
  wilsonLowerBound,
  type IntentInput,
} from '../src/intent.ts'

/** One input with defaults. */
function input(overrides: Partial<IntentInput> = {}): IntentInput {
  return { text: '', toolNames: [], hasImage: false, messageCount: 0, cwd: '', ...overrides }
}

/** Classify with defaults. */
function classify(text: string, overrides: Partial<IntentInput> = {}, config: ResolvedConfig = resolveConfig(undefined)) {
  return classifyIntent(input({ text, ...overrides }), { rules: [], scenarios: config.intent.scenarios })
}

describe('scenario classification', () => {
  it('sends a greeting to the cheap tier with high confidence', () => {
    const result = classify('Hello!')
    expect(result.scenario).toBe('daily')
    expect(result.tier).toBe('cheap')
    expect(result.confidence).toBe(0.92)
    expect(result.shortCircuit).toBe('greeting')
  })

  it('recognises explicit planning and review intent', () => {
    expect(classify('Plan the migration to the new storage backend').scenario).toBe('planning')
    expect(classify('Please review the authentication code').scenario).toBe('review')
    expect(classify('批量重命名这些文件').scenario).toBe('batch')
  })

  it('scores bilingual keywords and keeps the cheap tier for routine coding', () => {
    const result = classify('fix the bug in the parser test')
    expect(result.scenario).toBe('coding')
    expect(result.tier).toBe('cheap')
    expect(result.confidence).toBeGreaterThan(0.52)
  })

  it('requires two distinct CJK terms before a scenario scores', () => {
    const single = classify('代码')
    expect(single.scenario).toBe('daily')
    expect(single.confidence).toBe(0.25)
    const pair = classify('代码 修复')
    expect(pair.scenario).toBe('coding')
  })

  it('uses ASCII word boundaries, so debug is not bug', () => {
    expect(classify('debugging the flaky test').scenario).toBe('coding')
    expect(classify('the debugger stopped').confidence).toBeGreaterThanOrEqual(0.25)
  })

  it('short-circuits an image to the multimodal (strong) path', () => {
    const result = classify('what is this?', { hasImage: true })
    expect(result.scenario).toBe('multimodal')
    expect(result.tier).toBe('strong')
    expect(result.shortCircuit).toBe('image')
    expect(result.confidence).toBe(0.98)
  })

  it('short-circuits a very long input to the long-text (strong) path', () => {
    const result = classify('x'.repeat(12_001))
    expect(result.scenario).toBe('longText')
    expect(result.tier).toBe('strong')
    expect(result.shortCircuit).toBe('long-text')
  })

  it('escalates a routine scenario to strong when structural signals are high', () => {
    const text = `fix the bug\n\`\`\`\ncode\n\`\`\`\n\`\`\`\ncode\n\`\`\`\n${'y'.repeat(17_000)}`
    const result = classify(text)
    expect(result.tier).toBe('strong')
    expect(result.signals.score).toBeGreaterThanOrEqual(3)
  })

  it('respects a disabled scenario switch', () => {
    const config = resolveConfig({ intent: { scenarios: { multimodal: false } } })
    const result = classify('look at this', { hasImage: true }, config)
    expect(result.scenario).not.toBe('multimodal')
  })

  it('builds a stable fingerprint from scenario and bands', () => {
    const result = classify('fix the bug')
    expect(result.fingerprint).toBe(fingerprintOf('coding', result.signals))
    expect(result.fingerprint).toMatch(/^coding\|[0-3]\|[0-2]$/u)
  })
})

describe('structural signals', () => {
  it('counts token bands at their boundaries', () => {
    expect(computeSignals(input({ text: 'x'.repeat(15_996) })).tokenBands).toBe(0)
    expect(computeSignals(input({ text: 'x'.repeat(16_000) })).tokenBands).toBe(1)
    expect(computeSignals(input({ text: 'x'.repeat(48_000) })).tokenBands).toBe(2)
    expect(computeSignals(input({ text: 'x'.repeat(120_000) })).tokenBands).toBe(3)
  })

  it('counts tool calls and fences in two steps each', () => {
    const one = computeSignals(input({ text: 'a', toolNames: ['read_file'] }))
    expect(one.score).toBe(1)
    const four = computeSignals(input({ text: 'a', toolNames: ['a', 'b', 'c', 'd'] }))
    expect(four.score).toBe(2)
    const fences = computeSignals(input({ text: '```a```' }))
    expect(fences.score).toBe(1)
  })

  it('counts hard hints and message depth', () => {
    expect(computeSignals(input({ text: 'do this end to end' })).hardHints).toBe(1)
    expect(computeSignals(input({ text: 'a', messageCount: 12 })).score).toBe(1)
    expect(computeSignals(input({ text: 'a', messageCount: 30 })).score).toBe(2)
  })
})

describe('declarative rules', () => {
  const rules = compileRules([
    { id: 'low', when: { patterns: ['deploy'], tools: [], cwd: '' }, tier: 'cheap', priority: 1 },
    { id: 'high', when: { patterns: ['deploy'], tools: [], cwd: '' }, tier: 'strong', priority: 10 },
    { id: 'tool', when: { patterns: [], tools: ['write_file'], cwd: '' }, tier: 'strong', priority: 5 },
    { id: 'cwd', when: { patterns: ['build'], tools: [], cwd: 'D:\\repo' }, tier: 'strong', priority: 2 },
  ])

  it('orders by descending priority and takes the first match', () => {
    expect(evaluateRules(rules, input({ text: 'deploy the app' }))?.id).toBe('high')
  })

  it('matches tools and cwd constraints', () => {
    expect(evaluateRules(rules, input({ text: 'anything', toolNames: ['write_file'] }))?.id).toBe('tool')
    expect(evaluateRules(rules, input({ text: 'build it', cwd: 'D:\\repo\\src' }))?.id).toBe('cwd')
    expect(evaluateRules(rules, input({ text: 'build it', cwd: 'D:\\other' }))).toBeNull()
  })

  it('requires both axes when a rule declares patterns and tools', () => {
    const both = compileRules([{ id: 'both', when: { patterns: ['go'], tools: ['bash'], cwd: '' }, tier: 'strong', priority: 1 }])
    expect(evaluateRules(both, input({ text: 'go now', toolNames: [] }))).toBeNull()
    expect(evaluateRules(both, input({ text: 'go now', toolNames: ['bash'] }))?.id).toBe('both')
  })

  it('returns null for an empty table', () => {
    expect(evaluateRules([], input({ text: 'deploy' }))).toBeNull()
  })
})

describe('fingerprint posteriors', () => {
  it('computes the Wilson lower bound', () => {
    expect(wilsonLowerBound(0, 0)).toBe(0)
    expect(wilsonLowerBound(10, 10)).toBeGreaterThan(0.7)
    expect(wilsonLowerBound(1, 10)).toBeLessThan(0.3)
    expect(wilsonLowerBound(0, 10)).toBe(0)
  })

  it('abstains below the cold-start threshold', () => {
    const table = new PosteriorTable({ coldStart: 8 })
    table.record('k', 'cheap', true, 1)
    expect(table.verdict('k')).toBeNull()
    expect(table.verdict('unknown')).toBeNull()
  })

  it('forces strong when the cheap win rate is poor', () => {
    const table = new PosteriorTable({ coldStart: 4, epsilon: 0 })
    for (let index = 0; index < 8; index += 1) table.record('k', 'cheap', index < 2, index)
    expect(table.verdict('k')).toBe('strong')
  })

  it('keeps cheap when the cheap win rate is healthy', () => {
    const table = new PosteriorTable({ coldStart: 4, epsilon: 0 })
    for (let index = 0; index < 8; index += 1) table.record('k', 'cheap', index < 8, index)
    expect(table.verdict('k')).toBe('cheap')
  })

  it('explores at the epsilon rate', () => {
    const table = new PosteriorTable({ coldStart: 1, epsilon: 1 })
    table.record('k', 'cheap', true, 1)
    expect(table.verdict('k')).toBe('strong')
  })

  it('halves old counts once per half-life', () => {
    const table = new PosteriorTable({ halfLife: 2, coldStart: 100, epsilon: 0 })
    table.record('k', 'cheap', true, 1)
    table.record('k', 'cheap', true, 2)
    // The third observation is the half-life boundary: counts halve before it is added.
    table.record('k', 'cheap', true, 3)
    expect(table.get('k')?.cheapN).toBe(2)
    expect(table.get('k')?.cheapOK).toBe(2)
    table.record('k', 'cheap', true, 4)
    expect(table.get('k')?.cheapN).toBe(3)
    expect(table.get('k')?.observations).toBe(4)
  })

  it('evicts the oldest key at capacity', () => {
    const table = new PosteriorTable({ capacity: 2 })
    table.record('a', 'cheap', true, 1)
    table.record('b', 'cheap', true, 2)
    table.record('c', 'cheap', true, 3)
    expect(table.size).toBe(2)
    expect(table.get('a')).toBeUndefined()
    expect(table.get('c')).toBeDefined()
  })
})
