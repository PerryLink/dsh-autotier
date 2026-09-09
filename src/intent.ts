/**
 * The deterministic intent layer: a zero-token classifier (declarative rule
 * table, explicit-intent patterns, bilingual keyword scoring, structural
 * signals) plus the fingerprint posterior table that learns per-shape win rates
 * from terminal outcomes.
 *
 * Everything in this module is pure and synchronous, so the whole classification
 * matrix is unit-testable without a host. The low-confidence judge lives in
 * `judge.ts` and is consulted only when this layer reports low confidence.
 *
 * @module dsh-autotier/intent
 */

import type { ResolvedRule, ScenarioToggles } from './config.ts'
import type { Scenario, TierId } from './types.ts'

/** One declarative rule row, already resolved by `resolveConfig`. */
export interface CompiledRule {
  readonly id: string
  readonly patterns: readonly RegExp[]
  readonly tools: readonly string[]
  readonly cwd: string
  readonly tier: 'cheap' | 'strong'
  readonly priority: number
}

/** Compile the resolved rule table, ordered by descending priority. */
export function compileRules(rules: readonly ResolvedRule[]): CompiledRule[] {
  return rules
    .map(rule => ({
      id: rule.id,
      patterns: rule.when.patterns.map(pattern => new RegExp(pattern, 'u')),
      tools: rule.when.tools,
      cwd: rule.when.cwd,
      tier: rule.tier,
      priority: rule.priority,
    }))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
}

/** Input facts the classifier reads. All are derived from the live session. */
export interface IntentInput {
  /** The newest user message text. */
  readonly text: string
  /** Tool names already used in this session (advisory depth signal). */
  readonly toolNames: readonly string[]
  /** Whether the newest user message carries an image block. */
  readonly hasImage: boolean
  /** Number of messages in the session (turn-depth signal). */
  readonly messageCount: number
  /** Workspace path, matched against rule `when.cwd` prefixes. */
  readonly cwd: string
}

/** Structural signals computed from the input. */
export interface IntentSignals {
  readonly chars: number
  readonly estTokens: number
  /** How many of the token bands `[4000, 12000, 30000]` the input crosses. */
  readonly tokenBands: number
  readonly fences: number
  readonly toolCalls: number
  readonly messageCount: number
  readonly hardHints: number
  /** 0..8; `>= 3` escalates to the strong tier regardless of scenario. */
  readonly score: number
}

/** Why a classification short-circuited before keyword scoring. */
export type ShortCircuit = 'image' | 'long-text' | 'greeting' | 'explicit'

/** The classifier's verdict. */
export interface IntentResult {
  readonly scenario: Scenario
  readonly tier: TierId
  /** 0..1; the rule layer decides alone at or above `intent.ruleThreshold`. */
  readonly confidence: number
  /** Keyword score that produced the confidence. */
  readonly keywordScore: number
  readonly signals: IntentSignals
  readonly reasons: readonly string[]
  readonly shortCircuit: ShortCircuit | undefined
  /** Fingerprint of this shape: `scenario|tokenBand|fenceBand`. */
  readonly fingerprint: string
}

/** One declarative-rule hit. */
export interface RuleHit {
  readonly id: string
  readonly tier: 'cheap' | 'strong'
}

/**
 * Evaluate the declarative rule table. Rules are already sorted by descending
 * priority; the first match wins. A guard denial always outranks a rule (the
 * guard runs on `tools/pre-execute`, after the routing decision, and denies
 * regardless of tier).
 *
 * @param rules - compiled rules.
 * @param input - the live input facts.
 * @returns the winning hit, or null when no rule matches.
 */
export function evaluateRules(rules: readonly CompiledRule[], input: IntentInput): RuleHit | null {
  for (const rule of rules) {
    if (rule.cwd !== '' && !input.cwd.startsWith(rule.cwd)) continue
    const toolHit = rule.tools.some(tool => input.toolNames.includes(tool))
    const patternHit = rule.patterns.some(pattern => pattern.test(input.text))
    if (rule.tools.length > 0 && rule.patterns.length > 0) {
      if (!toolHit || !patternHit) continue
    } else if (rule.tools.length > 0) {
      if (!toolHit) continue
    } else if (!patternHit) {
      continue
    }
    return { id: rule.id, tier: rule.tier }
  }
  return null
}

/** Which tier each scenario belongs to by default. */
const SCENARIO_TIER: Record<Scenario, TierId> = {
  coding: 'cheap',
  review: 'strong',
  planning: 'strong',
  retrieval: 'cheap',
  batch: 'cheap',
  daily: 'cheap',
  longText: 'strong',
  multimodal: 'strong',
}

/** Scenario evaluation order: specific/expensive first, `daily` last (tie-break order). */
const SCENARIO_ORDER: readonly Scenario[] = ['planning', 'review', 'coding', 'batch', 'retrieval', 'longText', 'multimodal', 'daily']

/**
 * Bilingual keyword tables. ASCII terms are matched with word boundaries
 * (case-insensitive); CJK terms are matched as substrings and a scenario needs
 * at least two distinct CJK hits before they count, so a single two-character
 * word cannot drag a turn into a scenario.
 */
const KEYWORDS: Record<Scenario, readonly string[]> = {
  coding: ['implement', 'refactor', 'fix', 'bug', 'test', 'function', 'class', 'endpoint', 'api', '代码', '实现', '修复', '重构', '测试', '函数', '接口', '编译', '报错'],
  review: ['review', 'audit', 'security', 'vulnerability', 'hardening', '审查', '审计', '安全', '漏洞', '评审'],
  planning: ['plan', 'design', 'architect', 'architecture', 'roadmap', 'migrate', 'migration', '规划', '设计', '架构', '方案', '迁移'],
  retrieval: ['where', 'find', 'search', 'locate', 'grep', '查找', '搜索', '定位', '在哪'],
  batch: ['batch', 'bulk', 'every', 'rename', '批量', '全部', '每个', '遍历'],
  daily: ['hello', 'hi', 'hey', 'thanks', 'thank', 'weather', '你好', '您好', '谢谢', '天气'],
  longText: [],
  multimodal: [],
}

/** Whole-string greetings classify as daily with high confidence. */
const GREETING = /^(?:hi|hello|hey|thanks|thank you|你好|您好|谢谢|早上好|晚上好)[\s!.。,，!！]*$/iu

/** Explicit intent patterns that short-circuit keyword scoring. */
const EXPLICIT: readonly { scenario: Scenario; confidence: number; pattern: RegExp }[] = [
  { scenario: 'planning', confidence: 0.97, pattern: /^(?:please\s+)?(?:plan|design|architect)\b/iu },
  { scenario: 'planning', confidence: 0.95, pattern: /(?:规划|架构设计|方案设计|技术方案|从零实现)/u },
  { scenario: 'review', confidence: 0.96, pattern: /\b(?:code review|review the|audit the|security review)\b/iu },
  { scenario: 'review', confidence: 0.94, pattern: /(?:代码审查|安全审计|评审一下)/u },
  { scenario: 'batch', confidence: 0.95, pattern: /\b(?:batch|bulk)\b/iu },
  { scenario: 'batch', confidence: 0.94, pattern: /(?:批量处理|批量修改|批量重命名)/u },
]

/** Words that mark a multi-step or whole-system request. */
const HARD_HINTS: readonly string[] = [
  'and then', 'step by step', 'multi-step', 'end to end', 'end-to-end', 'entire', 'all of',
  'migrate', 'refactor', 'architecture', 'production', '从零', '完整', '整个', '多步', '端到端', '全流程',
]

/** Count non-overlapping occurrences of a fence marker. */
function countFences(text: string): number {
  return (text.match(/```/gu) ?? []).length
}

/** Count ASCII word-boundary hits, case-insensitive. */
function asciiHits(text: string, term: string): number {
  const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'giu')
  return (text.match(pattern) ?? []).length
}

/** Count CJK substring hits. */
function cjkHits(text: string, term: string): number {
  let count = 0
  let index = text.indexOf(term)
  while (index !== -1) {
    count += 1
    index = text.indexOf(term, index + term.length)
  }
  return count
}

/** Score one scenario against the text, applying the CJK co-occurrence rule. */
function scoreScenario(text: string, scenario: Scenario): number {
  let asciiScore = 0
  let cjkScore = 0
  let cjkTerms = 0
  for (const term of KEYWORDS[scenario]) {
    const isAscii = /^[\x20-\x7E]+$/u.test(term)
    const hits = isAscii ? asciiHits(text, term) : cjkHits(text, term)
    if (hits === 0) continue
    const weight = term.length > 3 ? 2 : 1
    if (isAscii) asciiScore += hits * weight
    else {
      cjkScore += hits * weight
      cjkTerms += 1
    }
  }
  // A single CJK word is too weak a signal; two distinct ones may score.
  return asciiScore + (cjkTerms >= 2 ? cjkScore : 0)
}

/** Compute the structural signal vector. */
export function computeSignals(input: IntentInput): IntentSignals {
  const chars = input.text.length
  const estTokens = Math.ceil(chars / 4)
  const tokenBands = [4_000, 12_000, 30_000].filter(band => estTokens >= band).length
  const fences = countFences(input.text)
  const toolCalls = input.toolNames.length
  const lower = input.text.toLowerCase()
  const hardHints = HARD_HINTS.filter(hint => lower.includes(hint)).length > 0 ? 1 : 0
  let score = tokenBands
  if (toolCalls >= 1) score += 1
  if (toolCalls >= 4) score += 1
  if (fences >= 1) score += 1
  if (fences >= 4) score += 1
  score += hardHints
  if (input.messageCount >= 12) score += 1
  if (input.messageCount >= 30) score += 1
  return {
    chars,
    estTokens,
    tokenBands,
    fences,
    toolCalls,
    messageCount: input.messageCount,
    hardHints,
    score,
  }
}

/** The token band index used in a fingerprint. */
function tokenBand(estTokens: number): number {
  if (estTokens < 4_000) return 0
  if (estTokens < 12_000) return 1
  if (estTokens < 30_000) return 2
  return 3
}

/** The fence band index used in a fingerprint. */
function fenceBand(fences: number): number {
  if (fences === 0) return 0
  if (fences < 4) return 1
  return 2
}

/** Build the fingerprint key for one classification. */
export function fingerprintOf(scenario: Scenario, signals: IntentSignals): string {
  return `${scenario}|${tokenBand(signals.estTokens)}|${fenceBand(signals.fences)}`
}

/** Options for {@link classifyIntent}. */
export interface ClassifyOptions {
  readonly rules?: readonly CompiledRule[];
  readonly scenarios: Required<ScenarioToggles>
  /** Score at or above which structural signals force the strong tier. */
  readonly signalThreshold?: number
}

/**
 * Classify one user input. Deterministic and token-free; the caller decides
 * whether the returned confidence warrants a judge call.
 *
 * @param input - the live input facts.
 * @param options - compiled rules and scenario switches.
 * @returns the verdict with its reasons.
 */
export function classifyIntent(input: IntentInput, options: ClassifyOptions): IntentResult {
  const signals = computeSignals(input)
  const reasons: string[] = []
  const enabled = (scenario: Scenario): boolean => options.scenarios[scenario]
  const finish = (scenario: Scenario, confidence: number, shortCircuit: ShortCircuit | undefined, keywordScore: number): IntentResult => {
    const tier: TierId = signals.score >= (options.signalThreshold ?? 3) ? 'strong' : SCENARIO_TIER[scenario]
    if (signals.score >= (options.signalThreshold ?? 3) && SCENARIO_TIER[scenario] === 'cheap') {
      reasons.push(`structural signals (score ${String(signals.score)}) force the strong tier`)
    }
    return {
      scenario,
      tier,
      confidence,
      keywordScore,
      signals,
      reasons,
      shortCircuit,
      fingerprint: fingerprintOf(scenario, signals),
    }
  }

  if (input.hasImage && enabled('multimodal')) {
    reasons.push('the message carries an image')
    return finish('multimodal', 0.98, 'image', 0)
  }
  if (signals.chars > 12_000 && enabled('longText')) {
    reasons.push(`long input (${String(signals.chars)} chars)`)
    return finish('longText', 0.96, 'long-text', 0)
  }
  if (GREETING.test(input.text.trim()) && enabled('daily')) {
    reasons.push('whole-message greeting')
    return finish('daily', 0.92, 'greeting', 0)
  }
  for (const entry of EXPLICIT) {
    if (enabled(entry.scenario) && entry.pattern.test(input.text)) {
      reasons.push(`explicit ${entry.scenario} intent`)
      return finish(entry.scenario, entry.confidence, 'explicit', 0)
    }
  }
  let best: { scenario: Scenario; score: number } = { scenario: 'daily', score: 0 }
  for (const scenario of SCENARIO_ORDER) {
    if (!enabled(scenario)) continue
    const score = scoreScenario(input.text, scenario)
    if (score > best.score) best = { scenario, score }
  }
  const keywordScore = best.score
  const scenario = keywordScore === 0 ? 'daily' : best.scenario
  const confidence = keywordScore === 0 ? 0.25 : Math.min(0.96, 0.52 + keywordScore * 0.1)
  if (keywordScore > 0) reasons.push(`keyword score ${String(keywordScore)} for ${scenario}`)
  else reasons.push('no keyword matched; defaulting to the cheap tier')
  return finish(scenario, confidence, undefined, keywordScore)
}

// ---- fingerprint posteriors -------------------------------------------------

/** One fingerprint's outcome counters. */
export interface Posterior {
  cheapOK: number
  cheapN: number
  strongOK: number
  strongN: number
  /** Epoch millis of the last observation. */
  lastSeen: number
  /** How many observations this key has accumulated (drives the half-life decay). */
  observations: number
  /** How many exploration probes were spent on this key. */
  probeN: number
}

/** The verdict a posterior yields. */
export type PosteriorVerdict = 'strong' | 'cheap' | null

/** Wilson score interval lower bound for `ok` successes in `n` trials. */
export function wilsonLowerBound(ok: number, n: number, z = 1.96): number {
  if (n <= 0) return 0
  const phat = ok / n
  const denom = 1 + (z * z) / n
  const centre = phat + (z * z) / (2 * n)
  const margin = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)
  return Math.max(0, (centre - margin) / denom)
}

/** Options for {@link PosteriorTable}. */
export interface PosteriorOptions {
  /** Observations between two half-life decays (default 10). */
  readonly halfLife?: number
  /** Cold-start threshold: below this total the table abstains (default 8). */
  readonly coldStart?: number
  /** Exploration probability (default 0.05). */
  readonly epsilon?: number
  /** LRU capacity (default 2000). */
  readonly capacity?: number
  /** Deterministic random source for tests. */
  readonly random?: () => number
}

/**
 * Per-fingerprint win-rate posteriors. Labels come from terminal task outcomes
 * only (never from the router's own judge call), and every write decays old
 * counts once per half-life so a shape's reputation can recover.
 */
export class PosteriorTable {
  private readonly entries = new Map<string, Posterior>()
  private readonly halfLife: number
  private readonly coldStart: number
  private readonly epsilon: number
  private readonly capacity: number
  private readonly random: () => number

  /** @param options - tuning knobs; defaults match the design table. */
  constructor(options: PosteriorOptions = {}) {
    this.halfLife = options.halfLife ?? 10
    this.coldStart = options.coldStart ?? 8
    this.epsilon = options.epsilon ?? 0.05
    this.capacity = options.capacity ?? 2_000
    this.random = options.random ?? Math.random
  }

  /** Number of tracked fingerprints. */
  get size(): number {
    return this.entries.size
  }

  /** Read one posterior without decaying it. */
  get(key: string): Posterior | undefined {
    return this.entries.get(key)
  }

  /** Record one terminal outcome for a fingerprint and tier. */
  record(key: string, tier: TierId, ok: boolean, now: number): void {
    const existing = this.entries.get(key)
    const base: Posterior = existing ?? {
      cheapOK: 0,
      cheapN: 0,
      strongOK: 0,
      strongN: 0,
      lastSeen: now,
      observations: 0,
      probeN: 0,
    }
    // Decay before the write so a key's reputation is bounded by its recent
    // history, then count the new observation.
    if (existing !== undefined && existing.observations > 0 && existing.observations % this.halfLife === 0) {
      base.cheapOK /= 2
      base.cheapN /= 2
      base.strongOK /= 2
      base.strongN /= 2
    }
    if (tier === 'cheap') {
      base.cheapN += 1
      if (ok) base.cheapOK += 1
    } else {
      base.strongN += 1
      if (ok) base.strongOK += 1
    }
    base.lastSeen = now
    base.observations += 1
    this.entries.delete(key)
    this.entries.set(key, base)
    while (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
  }

  /** Count one exploration probe on a key. */
  probe(key: string): void {
    const entry = this.entries.get(key)
    if (entry !== undefined) entry.probeN += 1
  }

  /**
   * The table's opinion about one fingerprint.
   * @param key - the fingerprint.
   * @returns `'strong'` when the cheap win rate is too low, `'cheap'` when it is
   *   healthy, and `null` when the table abstains (cold start or unknown key).
   */
  verdict(key: string): PosteriorVerdict {
    const entry = this.entries.get(key)
    if (entry === undefined) return null
    if (entry.cheapN + entry.strongN < this.coldStart) return null
    if (entry.cheapN > 0 && this.random() < this.epsilon) {
      return 'strong'
    }
    const cheapOK = entry.cheapOK
    const cheapN = entry.cheapN
    if (cheapN === 0) return entry.strongN > 0 ? 'strong' : null
    return wilsonLowerBound(cheapOK, cheapN) <= 0.5 ? 'strong' : 'cheap'
  }

  /** Snapshot every key, newest first, for `/tier status` and diagnostics. */
  snapshot(): { key: string; posterior: Posterior }[] {
    return [...this.entries.entries()].reverse().map(([key, posterior]) => ({ key, posterior: { ...posterior } }))
  }
}
