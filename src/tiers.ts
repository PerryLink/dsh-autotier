/**
 * Pure tier arithmetic: the adapter-owned effort ladder, tier-route
 * application, the effort-first escalation ladder, and the fallback-chain
 * classifier/advance helpers.
 *
 * The fallback vocabulary is ported from `dsh-tier-router`'s `lib/pure.js`
 * (MIT; see `THIRD_PARTY_NOTICES.md`), with two corrections: the effort ladder
 * is DeepSeek's `off | low | high | max` (upstream's `medium` does not exist and
 * would fail every request with `UNSUPPORTED_REASONING_EFFORT`), and the
 * classification is split into permanent/transient so the request-error handler
 * can honour the division of labour with `dsh-llm-retry` (permanent codes switch
 * the chain immediately; transient codes wait for retry exhaustion).
 *
 * @module dsh-autotier/tiers
 */

import type { LlmCallConfig } from '@deepseek-ai/dsh-llm'
import type { EffortId, TierId, TierRoute } from './types.ts'

/** The adapter-owned effort ladder, cheapest to strongest. */
export const EFFORT_LADDER = ['off', 'low', 'high', 'max'] as const satisfies readonly EffortId[]

/** Position of one effort on the ladder (0..3); unknown ids rank lowest. */
export function effortRank(effort: string): number {
  const index = (EFFORT_LADDER as readonly string[]).indexOf(effort)
  return index === -1 ? 0 : index
}

/**
 * The next effort step above `current`, never above `ceiling`.
 * @param current - the effort currently in force.
 * @param ceiling - the strongest effort to consider (default `max`).
 * @returns the next effort id, or null when already at or above the ceiling.
 */
export function nextEffortStep(current: EffortId, ceiling: EffortId = 'max'): EffortId | null {
  const start = effortRank(current)
  const stop = effortRank(ceiling)
  if (start >= stop) return null
  return EFFORT_LADDER[start + 1] ?? null
}

/** Whether two routes land on the same provider/model/effort triple. */
export function routeEquals(a: TierRoute, b: TierRoute): boolean {
  return a.provider === b.provider && a.model === b.model && a.effort === b.effort
}

/** One adapter-owned effort id as the LLM call config expects it (branded at the seam). */
function brandedEffort(effort: string): NonNullable<LlmCallConfig['reasoningEffort']> {
  // The adapter's `ReasoningEffortId` is a branded string; the brand is opaque
  // by design, and our vocabulary is validated against it before it gets here.
  return effort as unknown as NonNullable<LlmCallConfig['reasoningEffort']>
}

/**
 * Apply one tier route to a request configuration. The sampling scalars the
 * session already chose (`temperature`, `maxTokens`, `stop`) are preserved
 * exactly; the provider/model/effort triple is replaced. Returns the input
 * object unchanged when the route already matches, so the caller can skip a
 * logged header change.
 *
 * @param base - the configuration the loop proposed.
 * @param target - the tier landing to apply.
 * @returns the replacement configuration (or `base` when identical).
 */
export function resolveRoute(base: LlmCallConfig, target: TierRoute): LlmCallConfig {
  const sameLanding = base.provider === target.provider && base.model === target.model
  if (sameLanding && (target.effort === undefined || base.reasoningEffort === target.effort)) return base
  const next: LlmCallConfig = { provider: target.provider, model: target.model }
  // An absent target effort means "follow the session": carry the effort the
  // request already carries instead of dropping it (a dropped effort silently
  // falls back to the adapter default, which is the strongest one).
  const effort = target.effort ?? base.reasoningEffort
  if (effort !== undefined) next.reasoningEffort = brandedEffort(effort)
  if (base.temperature !== undefined) next.temperature = base.temperature
  if (base.maxTokens !== undefined) next.maxTokens = base.maxTokens
  if (base.stop !== undefined) next.stop = base.stop
  return next
}

/** One rung of the effort-first escalation ladder. */
export interface EscalationRung {
  /** The landing this rung applies. */
  readonly route: TierRoute
  /** The tier the rung belongs to (an effort rung on the cheap model is still cheap). */
  readonly tier: TierId
  /** Why this rung exists, for logs and `/tier status`. */
  readonly note: string
}

/**
 * Build the effort-first escalation ladder: raise the current model's effort
 * one step at a time (the KV prefix survives, and the official model-selection
 * notice is not emitted for an effort-only change) before paying for a model
 * switch. When both tiers share one model the ladder collapses to a single
 * effort-only rung.
 *
 * @param base - the configuration the loop proposed for the failing step.
 * @param cheap - the cheap tier landing.
 * @param strong - the strong tier landing.
 * @returns the ordered rungs; empty when escalation cannot change anything.
 */
export function escalationLadder(base: LlmCallConfig, cheap: TierRoute, strong: TierRoute): EscalationRung[] {
  const rungs: EscalationRung[] = []
  const baseEffort = (base.reasoningEffort ?? cheap.effort ?? 'low') as EffortId
  const onCheapModel = base.provider === cheap.provider && base.model === cheap.model
  const sharedModel = strong.provider === cheap.provider && strong.model === cheap.model
  if (sharedModel) {
    if (strong.effort !== undefined && strong.effort !== baseEffort) {
      rungs.push({
        route: { provider: strong.provider, model: strong.model, effort: strong.effort },
        tier: 'strong',
        note: `effort-only escalation on the shared model (${baseEffort} -> ${strong.effort})`,
      })
    }
    return rungs
  }
  if (onCheapModel) {
    let step = nextEffortStep(baseEffort)
    while (step !== null) {
      rungs.push({
        route: { provider: cheap.provider, model: cheap.model, effort: step },
        tier: 'cheap',
        note: `cheap-tier effort rung ${step}`,
      })
      step = nextEffortStep(step)
    }
  }
  rungs.push({
    route: strong.effort === undefined
      ? { provider: strong.provider, model: strong.model }
      : { provider: strong.provider, model: strong.model, effort: strong.effort },
    tier: 'strong',
    note: 'switch to the strong model',
  })
  return rungs
}

/** Failure codes that mean the route itself is unusable: switch the chain now. */
export const FALLBACK_PERMANENT_CODES = [
  'UNKNOWN_MODEL',
  'MISSING_CREDENTIAL',
  'INVALID_CREDENTIAL',
  'QUOTA',
] as const

/** Failure codes owned by `dsh-llm-retry` first: switch the chain only after retries are exhausted. */
export const FALLBACK_TRANSIENT_CODES = ['RATE_LIMIT', 'SERVER', 'TRANSPORT'] as const

/** Failure codes that must never switch the model. */
export const FALLBACK_IGNORE_CODES = [
  'CONTEXT_WINDOW_EXCEEDED',
  'UNSUPPORTED_REASONING_EFFORT',
  'ABORTED',
  'EMPTY_RESPONSE',
] as const

/** How one failure relates to the fallback chain. */
export type FallbackClass = 'permanent' | 'transient' | 'ignore' | 'unknown'

/**
 * Classify one failed model request for the fallback machinery.
 * @param failure - the normalized failure facts (`code` and optional `status`).
 * @returns the chain verdict.
 */
export function classifyFallback(failure: { code?: unknown; status?: unknown } | undefined): FallbackClass {
  if (failure === undefined || failure === null || typeof failure !== 'object') return 'unknown'
  const code = typeof failure.code === 'string' ? failure.code : undefined
  if (code !== undefined) {
    if ((FALLBACK_PERMANENT_CODES as readonly string[]).includes(code)) return 'permanent'
    if ((FALLBACK_TRANSIENT_CODES as readonly string[]).includes(code)) return 'transient'
    if ((FALLBACK_IGNORE_CODES as readonly string[]).includes(code)) return 'ignore'
  }
  if (typeof failure.status === 'number' && failure.status >= 500) return 'transient'
  return 'unknown'
}

/** One agent's position in one tier's fallback chain. */
export interface FallbackRecord {
  /** The tier whose chain this record belongs to. */
  tier: TierId
  /** Index in that tier's chain; -1 means the tier's own landing. */
  index: number
  /** Epoch millis until which the record stays in force. */
  until: number
}

/** Whether a fallback record is currently pinning the agent to a chain entry. */
export function fallbackActive(record: FallbackRecord | undefined, now: number): boolean {
  return record !== undefined && record.index >= 0 && record.until > now
}

/**
 * Advance a fallback record one step down one tier's chain.
 * @param record - the current record (absent or from another tier = start of this chain).
 * @param tier - the tier whose chain is being walked.
 * @param chainLength - the number of configured fallback entries.
 * @param now - current epoch millis.
 * @param ttlMs - how long the new entry stays in force.
 * @returns the next record, or null when the chain is exhausted.
 */
export function advanceFallback(
  record: FallbackRecord | undefined,
  tier: TierId,
  chainLength: number,
  now: number,
  ttlMs: number,
): FallbackRecord | null {
  const index = record !== undefined && record.tier === tier ? record.index : -1
  const next = index + 1
  if (next >= chainLength) return null
  return { tier, index: next, until: now + (Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 300_000) }
}
