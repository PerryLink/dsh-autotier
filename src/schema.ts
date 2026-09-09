/**
 * The raw (possibly partial) configuration surface of dsh-autotier: the
 * Schemastery schema the Loader validates and the settings UI renders, plus the
 * interfaces it resolves to. The judgement that turns a raw config into a
 * resolved one lives in `config.ts`, so this module stays free of executable
 * logic (a schema module must not mix function values into its declarations).
 *
 * @module dsh-autotier/schema
 */

import z from '@deepseek-ai/schemastery'
import {
  COST_MODES,
  EFFORT_IDS,
  ROUTING_MODES,
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


/** The default strong tier: the catalog's quality-critical model at high effort. */
export const DEFAULT_STRONG = {
  provider: 'deepseek-official',
  model: 'deepseek-v4-pro',
  effort: 'high' as const,
  followSession: false,
}

/** The default cheap tier: the catalog's routine/parallel model at low effort. */
export const DEFAULT_CHEAP = {
  provider: 'deepseek-official',
  model: 'deepseek-v4-flash',
  effort: 'low' as const,
  followSession: true,
}

/** The default vision landing: the catalog's only image-capable model. */
export const DEFAULT_VISION = {
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

