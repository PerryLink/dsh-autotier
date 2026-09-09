/**
 * Config schema and resolution for `dsh-autotier`. Every tunable is a validated
 * {@link Config} field changeable from cordis.yml or the `autotier` settings
 * namespace; {@link resolveConfig} re-judges every default, bound and
 * cross-field requirement field by field, so programmatic construction that
 * bypasses Schemastery normalization still fails loud (the explicit-resolve
 * contract).
 *
 * Two adapter-owned vocabularies are pinned here on purpose:
 * `reasoningEffort` accepts exactly `off | low | high | max` (the DeepSeek
 * adapter's set; `medium` does not exist and an unsupported value fails every
 * request with `UNSUPPORTED_REASONING_EFFORT`), and the default strong model is
 * `deepseek-v4-pro` (the catalog id, not the display name).
 *
 * @module dsh-autotier/config
 */

import z from '@deepseek-ai/schemastery'
import {
  COST_MODES,
  EFFORT_IDS,
  ROUTING_MODES,
  SCENARIOS,
  type CostMode,
  type EffortId,
  type RoutingMode,
  type Scenario,
} from './types.ts'

/** One fallback landing in a tier's chain (provider/model only; effort follows the target tier). */
export interface FallbackEntry {
  provider?: string
  model?: string
}

/** One tier's landing plus its fallback chain. */
export interface TierConfig {
  provider?: string
  model?: string
  effort?: EffortId
  followSession?: boolean
  fallback?: FallbackEntry[]
}

/** The image-capable landing used when a turn carries images. */
export interface VisionConfig {
  provider?: string
  model?: string
}

/** One declarative intent rule: highest priority match wins. */
export interface IntentRule {
  id?: string
  when?: { patterns?: string[]; tools?: string[]; cwd?: string }
  tier?: 'cheap' | 'strong'
  priority?: number
}

/** Low-confidence judge (a cheap model classifies intent only). */
export interface JudgeConfig {
  enabled?: boolean
  /** Empty = pick the first catalog model whose id contains `flash`. */
  model?: string
  temperature?: number
  maxTokens?: number
  cooldownMs?: number
  timeoutMs?: number
  /** Consecutive judge failures after which this turn skips the judge. */
  unavailableSkip?: number
}

/** Per-scenario switches; a disabled scenario never routes itself. */
export type ScenarioToggles = { [K in Scenario]?: boolean }

/** Intent classification and arbitration. */
export interface IntentConfig {
  /** Confidence at or above which the rule layer decides without the judge. */
  ruleThreshold?: number
  /** Attempt-first middle band; disabled until calibration lands. */
  attemptBand?: { enabled?: boolean; tauLow?: number }
  /** Application-side double threshold that stops tier flapping. */
  hysteresis?: { toStrong?: number; toCheap?: number }
  rules?: IntentRule[]
  judge?: JudgeConfig
  scenarios?: ScenarioToggles
  costMode?: CostMode
}

/** High-risk guard switches. */
export interface GuardConfig {
  enabled?: boolean
  /** Tiers whose execution the guard protects (only `cheap` is meaningful). */
  tiers?: ('cheap')[]
  /** Command/tool names or path prefixes that never trip the guard. */
  whitelist?: string[]
  /** Self-modification surfaces that force strong-tier review. */
  protectedPaths?: string[]
  /** Relationship with dsh-defend: `auto` audits coexistence, `none` stays silent. */
  interopDefend?: 'auto' | 'none'
}

/** Failure escalation and TTL fallback. */
export interface EscalationConfig {
  threshold?: number
  windowMs?: number
  ttlMs?: number
  fallbackTtlMs?: number
  /** Count same-signature recurrences instead of every failure. */
  signature?: boolean
}

/**
 * Raw (possibly partial) plugin configuration. Every field is optional because
 * the resolver supplies the defaults; {@link resolveConfig} turns it into the
 * fully-resolved {@link ResolvedConfig}.
 */
export interface Config {
  tiers?: { strong?: TierConfig; cheap?: TierConfig; vision?: VisionConfig }
  intent?: IntentConfig
  guard?: GuardConfig
  escalation?: EscalationConfig
  routingMode?: RoutingMode
}

/** One resolved fallback landing. */
export interface ResolvedFallbackEntry {
  provider: string
  model: string
}

/** One resolved tier landing. Runtime-frozen by {@link resolveConfig}. */
export interface ResolvedTierConfig {
  provider: string
  model: string
  effort: EffortId
  followSession: boolean
  fallback: ResolvedFallbackEntry[]
}

/** One fully-resolved declarative rule. */
export interface ResolvedRule {
  id: string
  when: { patterns: string[]; tools: string[]; cwd: string }
  tier: 'cheap' | 'strong'
  priority: number
}

/** Fully-resolved configuration: every field present, runtime-frozen. */
export interface ResolvedConfig {
  tiers: {
    strong: ResolvedTierConfig
    cheap: ResolvedTierConfig
    vision: Required<VisionConfig>
  }
  intent: {
    ruleThreshold: number
    attemptBand: { enabled: boolean; tauLow: number }
    hysteresis: { toStrong: number; toCheap: number }
    rules: ResolvedRule[]
    judge: Required<JudgeConfig>
    scenarios: Required<ScenarioToggles>
    costMode: CostMode
  }
  guard: {
    enabled: boolean
    tiers: ('cheap')[]
    whitelist: string[]
    protectedPaths: string[]
    interopDefend: 'auto' | 'none'
  }
  escalation: {
    threshold: number
    windowMs: number
    ttlMs: number
    fallbackTtlMs: number
    signature: boolean
  }
  routingMode: RoutingMode
}

/** The default strong tier: the catalog's quality-critical model at high effort. */
const DEFAULT_STRONG = {
  provider: 'deepseek-official',
  model: 'deepseek-v4-pro',
  effort: 'high' as const,
  followSession: false,
}

/** The default cheap tier: the catalog's routine/parallel model at low effort. */
const DEFAULT_CHEAP = {
  provider: 'deepseek-official',
  model: 'deepseek-v4-flash',
  effort: 'low' as const,
  followSession: true,
}

/** The default vision landing: the catalog's only image-capable model. */
const DEFAULT_VISION = {
  provider: 'deepseek-official',
  model: 'deepseek-v4-flash-vision-exp',
}

/** One tier schema; complete objects are required for `.default()`. */
const TierSchema = z.object({
  provider: z.string().default('deepseek-official'),
  model: z.string().default('deepseek-v4-flash'),
  // Adapter-owned vocabulary: off | low | high | max. A value outside this set
  // is a dead configuration (every request fails with UNSUPPORTED_REASONING_EFFORT).
  effort: z.union([...EFFORT_IDS]).default('low'),
  followSession: z.boolean().default(false),
  fallback: z.array(z.object({
    provider: z.string().default('deepseek-official'),
    model: z.string().default(''),
  })).default([]),
})

/** Schemastery schema: the loader validates and fills defaults before `apply`. */
export const Config: z<Config> = z.object({
  tiers: z.object({
    strong: TierSchema.default({ ...DEFAULT_STRONG, fallback: [] }),
    cheap: TierSchema.default({ ...DEFAULT_CHEAP, fallback: [] }),
    vision: z.object({
      provider: z.string().default('deepseek-official'),
      model: z.string().default('deepseek-v4-flash-vision-exp'),
    }).default({ ...DEFAULT_VISION }),
  }).default({
    strong: { ...DEFAULT_STRONG, fallback: [] },
    cheap: { ...DEFAULT_CHEAP, fallback: [] },
    vision: { ...DEFAULT_VISION },
  }),
  intent: z.object({
    ruleThreshold: z.number().min(0.000001).max(1).default(0.7),
    attemptBand: z.object({
      enabled: z.boolean().default(false),
      tauLow: z.number().min(0).max(1).default(0.45),
    }).default({ enabled: false, tauLow: 0.45 }),
    hysteresis: z.object({
      toStrong: z.number().min(0).max(1).default(0.8),
      toCheap: z.number().min(0).max(1).default(0.6),
    }).default({ toStrong: 0.8, toCheap: 0.6 }),
    rules: z.array(z.object({
      id: z.string().default(''),
      when: z.object({
        patterns: z.array(z.string()).default([]),
        tools: z.array(z.string()).default([]),
        cwd: z.string().default(''),
      }).default({ patterns: [], tools: [], cwd: '' }),
      tier: z.union(['cheap', 'strong']).default('strong'),
      priority: z.number().default(0),
    })).default([]),
    judge: z.object({
      enabled: z.boolean().default(true),
      model: z.string().default(''),
      temperature: z.number().min(0).max(2).default(0),
      maxTokens: z.number().step(1).min(1).max(4_096).default(16),
      cooldownMs: z.number().min(0).max(3_600_000).default(30_000),
      timeoutMs: z.number().min(1).max(120_000).default(2_000),
      unavailableSkip: z.number().step(1).min(0).max(100).default(2),
    }).default({
      enabled: true,
      model: '',
      temperature: 0,
      maxTokens: 16,
      cooldownMs: 30_000,
      timeoutMs: 2_000,
      unavailableSkip: 2,
    }),
    scenarios: z.object({
      coding: z.boolean().default(true),
      review: z.boolean().default(true),
      planning: z.boolean().default(true),
      retrieval: z.boolean().default(true),
      batch: z.boolean().default(true),
      daily: z.boolean().default(true),
      longText: z.boolean().default(true),
      multimodal: z.boolean().default(true),
    }).default({
      coding: true,
      review: true,
      planning: true,
      retrieval: true,
      batch: true,
      daily: true,
      longText: true,
      multimodal: true,
    }),
    costMode: z.union([...COST_MODES]).default('balanced'),
  }).default({
    ruleThreshold: 0.7,
    attemptBand: { enabled: false, tauLow: 0.45 },
    hysteresis: { toStrong: 0.8, toCheap: 0.6 },
    rules: [],
    judge: {
      enabled: true,
      model: '',
      temperature: 0,
      maxTokens: 16,
      cooldownMs: 30_000,
      timeoutMs: 2_000,
      unavailableSkip: 2,
    },
    scenarios: {
      coding: true,
      review: true,
      planning: true,
      retrieval: true,
      batch: true,
      daily: true,
      longText: true,
      multimodal: true,
    },
    costMode: 'balanced',
  }),
  guard: z.object({
    enabled: z.boolean().default(true),
    tiers: z.array(z.union(['cheap'])).default(['cheap']),
    whitelist: z.array(z.string()).default([]),
    protectedPaths: z.array(z.string()).default(['.dsh', 'AGENTS.md', 'package.json', '.github/workflows']),
    interopDefend: z.union(['auto', 'none']).default('auto'),
  }).default({
    enabled: true,
    tiers: ['cheap'],
    whitelist: [],
    protectedPaths: ['.dsh', 'AGENTS.md', 'package.json', '.github/workflows'],
    interopDefend: 'auto',
  }),
  escalation: z.object({
    threshold: z.number().step(1).min(1).max(100).default(2),
    windowMs: z.number().min(1).max(86_400_000).default(60_000),
    ttlMs: z.number().min(1).max(86_400_000).default(180_000),
    fallbackTtlMs: z.number().min(1).max(86_400_000).default(300_000),
    signature: z.boolean().default(true),
  }).default({
    threshold: 2,
    windowMs: 60_000,
    ttlMs: 180_000,
    fallbackTtlMs: 300_000,
    signature: true,
  }),
  routingMode: z.union([...ROUTING_MODES]).default('auto'),
})

/** Throw the standard fail-loud config error for one invalid field. */
function invalid(field: string, detail: string): never {
  throw new Error(`dsh-autotier: config.${field} ${detail}`)
}

/** Read a required non-empty string field, failing loud when absent or blank. */
function text(field: string, value: string | undefined, fallback: string): string {
  const resolved = value ?? fallback
  if (typeof resolved !== 'string' || resolved.trim().length === 0) invalid(field, 'must be a non-empty string')
  return resolved
}

/** Read a bounded finite number. */
function number(field: string, value: number | undefined, fallback: number, min: number, max: number): number {
  const resolved = value ?? fallback
  if (!Number.isFinite(resolved) || resolved < min || resolved > max) {
    invalid(field, `must be a finite number in [${String(min)}, ${String(max)}]`)
  }
  return resolved
}

/** Read an integer in a closed range. */
function integer(field: string, value: number | undefined, fallback: number, min: number, max: number): number {
  const resolved = value ?? fallback
  if (!Number.isInteger(resolved) || resolved < min || resolved > max) {
    invalid(field, `must be an integer in [${String(min)}, ${String(max)}]`)
  }
  return resolved
}

/** Read a boolean switch. */
function boolean(field: string, value: boolean | undefined, fallback: boolean): boolean {
  const resolved = value ?? fallback
  if (typeof resolved !== 'boolean') invalid(field, 'must be a boolean')
  return resolved
}

/** Read one member of a closed string set. */
function member<T extends string>(field: string, value: string | undefined, fallback: T, allowed: readonly T[]): T {
  const resolved = value ?? fallback
  if (!(allowed as readonly string[]).includes(resolved)) {
    invalid(field, `must be one of ${allowed.join(', ')}`)
  }
  return resolved as T
}

/** Resolve one tier, judging its landing, effort vocabulary and fallback chain. */
function resolveTier(
  tier: 'strong' | 'cheap',
  raw: TierConfig | undefined,
  fallback: { provider: string; model: string; effort: EffortId; followSession: boolean },
): ResolvedTierConfig {
  const provider = text(`tiers.${tier}.provider`, raw?.provider, fallback.provider)
  const model = text(`tiers.${tier}.model`, raw?.model, fallback.model)
  const effort = member(`tiers.${tier}.effort`, raw?.effort, fallback.effort, EFFORT_IDS)
  const followSession = boolean(`tiers.${tier}.followSession`, raw?.followSession, fallback.followSession)
  const chain: ResolvedFallbackEntry[] = []
  const seen = new Set<string>([`${provider}/${model}`])
  for (const [index, entry] of (raw?.fallback ?? []).entries()) {
    const entryProvider = text(`tiers.${tier}.fallback[${String(index)}].provider`, entry.provider, '')
    const entryModel = text(`tiers.${tier}.fallback[${String(index)}].model`, entry.model, '')
    const key = `${entryProvider}/${entryModel}`
    if (seen.has(key)) {
      invalid(`tiers.${tier}.fallback[${String(index)}]`, `duplicates the tier landing or an earlier fallback (${key})`)
    }
    seen.add(key)
    chain.push({ provider: entryProvider, model: entryModel })
  }
  return { provider, model, effort, followSession, fallback: chain }
}

/** Resolve the intent section. */
function resolveIntent(raw: IntentConfig | undefined): ResolvedConfig['intent'] {
  const intent = raw ?? {}
  const ruleThreshold = number('intent.ruleThreshold', intent.ruleThreshold, 0.7, 0.000001, 1)
  const tauLow = number('intent.attemptBand.tauLow', intent.attemptBand?.tauLow, 0.45, 0, 1)
  if (tauLow >= ruleThreshold) {
    invalid('intent.attemptBand.tauLow', `must stay below intent.ruleThreshold (${String(tauLow)} >= ${String(ruleThreshold)})`)
  }
  const toStrong = number('intent.hysteresis.toStrong', intent.hysteresis?.toStrong, 0.8, 0, 1)
  const toCheap = number('intent.hysteresis.toCheap', intent.hysteresis?.toCheap, 0.6, 0, 1)
  if (toCheap >= toStrong) {
    invalid('intent.hysteresis', `toCheap (${String(toCheap)}) must stay below toStrong (${String(toStrong)})`)
  }
  const rules: ResolvedRule[] = []
  const ruleIds = new Set<string>()
  for (const [index, rule] of (intent.rules ?? []).entries()) {
    const id = text(`intent.rules[${String(index)}].id`, rule.id, '')
    if (ruleIds.has(id)) invalid(`intent.rules[${String(index)}].id`, `duplicates rule id ${JSON.stringify(id)}`)
    ruleIds.add(id)
    const priority = rule.priority ?? 0
    if (!Number.isFinite(priority)) invalid(`intent.rules[${String(index)}].priority`, 'must be a finite number')
    const patterns = [...(rule.when?.patterns ?? [])]
    const tools = [...(rule.when?.tools ?? [])]
    if (patterns.length === 0 && tools.length === 0) {
      invalid(`intent.rules[${String(index)}].when`, 'must declare at least one pattern or tool')
    }
    for (const [patternIndex, pattern] of patterns.entries()) {
      if (typeof pattern !== 'string' || pattern.length === 0) {
        invalid(`intent.rules[${String(index)}].when.patterns[${String(patternIndex)}]`, 'must be a non-empty regular expression')
      }
      try {
        new RegExp(pattern)
      } catch (error) {
        invalid(
          `intent.rules[${String(index)}].when.patterns[${String(patternIndex)}]`,
          `is not a valid regular expression (${String(error)})`,
        )
      }
    }
    for (const [toolIndex, tool] of tools.entries()) {
      if (typeof tool !== 'string' || tool.trim().length === 0) {
        invalid(`intent.rules[${String(index)}].when.tools[${String(toolIndex)}]`, 'must be a non-empty tool name')
      }
    }
    rules.push({
      id,
      when: { patterns, tools, cwd: rule.when?.cwd ?? '' },
      tier: member(`intent.rules[${String(index)}].tier`, rule.tier, 'strong', ['cheap', 'strong'] as const),
      priority,
    })
  }
  const judge = intent.judge ?? {}
  const judgeModel = judge.model ?? ''
  if (typeof judgeModel !== 'string') invalid('intent.judge.model', 'must be a string (empty = auto)')
  const scenarios = Object.fromEntries(SCENARIOS.map(scenario => [
    scenario,
    boolean(`intent.scenarios.${scenario}`, intent.scenarios?.[scenario], true),
  ])) as Required<ScenarioToggles>
  return {
    ruleThreshold,
    attemptBand: { enabled: boolean('intent.attemptBand.enabled', intent.attemptBand?.enabled, false), tauLow },
    hysteresis: { toStrong, toCheap },
    rules,
    judge: {
      enabled: boolean('intent.judge.enabled', judge.enabled, true),
      model: judgeModel,
      temperature: number('intent.judge.temperature', judge.temperature, 0, 0, 2),
      maxTokens: integer('intent.judge.maxTokens', judge.maxTokens, 16, 1, 4_096),
      cooldownMs: number('intent.judge.cooldownMs', judge.cooldownMs, 30_000, 0, 3_600_000),
      timeoutMs: number('intent.judge.timeoutMs', judge.timeoutMs, 2_000, 1, 120_000),
      unavailableSkip: integer('intent.judge.unavailableSkip', judge.unavailableSkip, 2, 0, 100),
    },
    scenarios,
    costMode: member('intent.costMode', intent.costMode, 'balanced', COST_MODES),
  }
}

/** Resolve the guard section. */
function resolveGuard(raw: GuardConfig | undefined): ResolvedConfig['guard'] {
  const guard = raw ?? {}
  const whitelist = [...(guard.whitelist ?? [])]
  for (const [index, entry] of whitelist.entries()) {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      invalid(`guard.whitelist[${String(index)}]`, 'must be a non-empty string')
    }
  }
  const protectedPaths = [...(guard.protectedPaths ?? ['.dsh', 'AGENTS.md', 'package.json', '.github/workflows'])]
  for (const [index, entry] of protectedPaths.entries()) {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      invalid(`guard.protectedPaths[${String(index)}]`, 'must be a non-empty path or glob')
    }
  }
  return {
    enabled: boolean('guard.enabled', guard.enabled, true),
    tiers: guard.tiers === undefined ? ['cheap'] : guard.tiers.map((tier, index) => {
      if (tier !== 'cheap') invalid(`guard.tiers[${String(index)}]`, 'must be "cheap"')
      return tier
    }),
    whitelist,
    protectedPaths,
    interopDefend: member('guard.interopDefend', guard.interopDefend, 'auto', ['auto', 'none'] as const),
  }
}

/** Resolve the escalation section. */
function resolveEscalation(raw: EscalationConfig | undefined): ResolvedConfig['escalation'] {
  const escalation = raw ?? {}
  return {
    threshold: integer('escalation.threshold', escalation.threshold, 2, 1, 100),
    windowMs: number('escalation.windowMs', escalation.windowMs, 60_000, 1, 86_400_000),
    ttlMs: number('escalation.ttlMs', escalation.ttlMs, 180_000, 1, 86_400_000),
    fallbackTtlMs: number('escalation.fallbackTtlMs', escalation.fallbackTtlMs, 300_000, 1, 86_400_000),
    signature: boolean('escalation.signature', escalation.signature, true),
  }
}

/** Deep-freeze a resolved configuration tree. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested)
    Object.freeze(value)
  }
  return value
}

/**
 * Resolve raw config to the frozen runtime policy, re-judging every default,
 * bound and cross-field requirement.
 *
 * @param raw - raw loader config; `undefined` for a bare row.
 * @returns the frozen resolved config.
 * @throws {Error} when a value is out of bounds or a cross-field requirement fails.
 */
export function resolveConfig(raw: Config | undefined): ResolvedConfig {
  const tiers = raw?.tiers ?? {}
  const strong = resolveTier('strong', tiers.strong, DEFAULT_STRONG)
  const cheap = resolveTier('cheap', tiers.cheap, DEFAULT_CHEAP)
  const strongTriple = `${strong.provider}/${strong.model}@${strong.effort}`
  const cheapTriple = `${cheap.provider}/${cheap.model}@${cheap.effort}`
  if (strongTriple === cheapTriple) {
    invalid('tiers', `strong and cheap resolve to the same landing (${strongTriple}); tiering would be a no-op`)
  }
  const resolved: ResolvedConfig = {
    tiers: {
      strong,
      cheap,
      vision: {
        provider: text('tiers.vision.provider', tiers.vision?.provider, DEFAULT_VISION.provider),
        model: text('tiers.vision.model', tiers.vision?.model, DEFAULT_VISION.model),
      },
    },
    intent: resolveIntent(raw?.intent),
    guard: resolveGuard(raw?.guard),
    escalation: resolveEscalation(raw?.escalation),
    routingMode: member('routingMode', raw?.routingMode, 'auto', ROUTING_MODES),
  }
  return deepFreeze(resolved)
}

/**
 * Judge a configuration without keeping the resolved value. This is the
 * save-time hook the `autotier` settings namespace registers, so a user write
 * that violates a cross-field requirement is refused at the write instead of
 * silently disabling the plugin.
 *
 * @param value - the configuration to judge.
 * @throws {Error} when the configuration is invalid.
 */
export function validateConfig(value: Config): void {
  resolveConfig(value)
}
