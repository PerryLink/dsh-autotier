/**
 * Shared vocabulary for dsh-autotier: the tier ids, the adapter-owned reasoning
 * effort ids, the routing modes, and the public route/status shapes every
 * module and the `ctx.autotier` service speak.
 * @module dsh-autotier/types
 */

/**
 * Service Definition (contract layer): the two cost tiers this plugin routes
 * between. `strong` plans complex intent and reviews high-risk work; `cheap`
 * implements it. The ids are stable wire/settings vocabulary.
 */
export const TIER_IDS = ['strong', 'cheap'] as const

/** One of the two cost tiers. */
export type TierId = (typeof TIER_IDS)[number]

/**
 * Reasoning-effort ids owned by the provider adapter. The DeepSeek adapter
 * accepts exactly these four (`packages/llm/llm-deepseek/src/index.ts:133`);
 * `medium` does not exist, and an unsupported value fails every request with
 * `UNSUPPORTED_REASONING_EFFORT` instead of degrading.
 */
export const EFFORT_IDS = ['off', 'low', 'high', 'max'] as const

/** One adapter-owned reasoning-effort id. */
export type EffortId = (typeof EFFORT_IDS)[number]

/**
 * Routing modes. `auto` is the fully automatic path; the rest are explicit
 * user overrides (`/tier strong|cheap|off`). `delegated` means the session
 * carries an explicit model selection that autotier must not fight.
 */
export const ROUTING_MODES = ['auto', 'strong', 'cheap', 'delegated', 'off'] as const

/** One routing mode. */
export type RoutingMode = (typeof ROUTING_MODES)[number]

/** Intent classes the rule layer and the judge distinguish. */
export const SCENARIOS = [
  'coding',
  'review',
  'planning',
  'retrieval',
  'batch',
  'daily',
  'longText',
  'multimodal',
] as const

/** One intent class. */
export type Scenario = (typeof SCENARIOS)[number]

/** Cost/quality arbitration direction when the signals are ambiguous. */
export const COST_MODES = ['cost-first', 'quality-first', 'balanced'] as const

/** One cost/quality arbitration direction. */
export type CostMode = (typeof COST_MODES)[number]

/**
 * One concrete tier landing: the provider/model pair plus the reasoning effort
 * the request should carry. `effort` is omitted only when the tier inherits
 * the session's own effort (followSession).
 */
export interface TierRoute {
  readonly provider: string
  readonly model: string
  readonly effort?: EffortId
}

/**
 * Why a tier was chosen. `source` is the arbitration layer that won, so an
 * operator can tell a rule hit from a judge call from an escalation.
 */
export type RouteSource =
  | 'manual'
  | 'rule'
  | 'judge'
  | 'posterior'
  | 'plan-mode'
  | 'guard'
  | 'escalation'
  | 'fallback'
  | 'default'

/** One routing decision with its provenance. */
export interface RouteDecision {
  /** The tier the request should use. */
  readonly tier: TierId
  /** The concrete landing. */
  readonly route: TierRoute
  /** The arbitration layer that produced this decision. */
  readonly source: RouteSource
  /** 0..1 confidence of the intent classification (1 for explicit overrides). */
  readonly confidence: number
  /** Short human-readable reason, safe for logs and `/tier status`. */
  readonly reason: string
}

/**
 * Service Definition (contract layer): the read-only status snapshot served by
 * `ctx.autotier.status()` and rendered by `/tier status` and the `tier_status`
 * tool. Third-party plugins may depend on this shape.
 */
export interface AutotierStatus {
  /** Current routing mode. */
  readonly mode: RoutingMode
  /** Configured landing per tier (effort omitted when inherited). */
  readonly tiers: { readonly strong: TierRoute; readonly cheap: TierRoute; readonly vision: TierRoute }
  /** Guard switches. */
  readonly guard: { readonly enabled: boolean; readonly tiers: readonly TierId[] }
  /** Escalation switches. */
  readonly escalation: {
    readonly threshold: number
    readonly windowMs: number
    readonly ttlMs: number
    readonly fallbackTtlMs: number
    readonly signature: boolean
  }
}
