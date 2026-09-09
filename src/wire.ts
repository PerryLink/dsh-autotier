/**
 * The `tier` Remote wire vocabulary: the status/catalog/setMode payload types,
 * their zod v4 validation schemas (the strict codecs both Typert faces carry),
 * and the invocation descriptors shared verbatim by the host `./typert`
 * manifest (`src/typert.host.ts`) and the client Remote contribution
 * (`src/client/remote.ts`). One canonical source keeps the two codecs from ever
 * drifting apart.
 *
 * `TierStatus` extends the host's public {@link AutotierStatus} additively with
 * one `session` view: the per-agent override and the last applied tier are
 * runtime state that lives in a `WeakMap` keyed by Agent, so they can only be
 * reported for a concrete agent id. `mode` on the base status stays the
 * composition mode; `session.mode` is the effective mode for that agent.
 *
 * @module dsh-autotier/wire
 */

import { z } from 'zod'
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol'
import {
  EFFORT_IDS,
  ROUTING_MODES,
  TIER_IDS,
  type AutotierStatus,
  type RouteSource,
  type RoutingMode,
  type TierId,
} from './types.ts'

/** The Typert Remote namespace and Cordis service key of the browser face. */
export const TIER_NAMESPACE = 'tier'

/**
 * Every {@link RouteSource} member, as a runtime tuple. Kept next to the wire
 * schema because the source crosses the Remote boundary inside the session
 * view; `satisfies` rejects a typo or a member that no longer exists.
 */
export const ROUTE_SOURCES = [
  'manual',
  'rule',
  'judge',
  'posterior',
  'plan-mode',
  'guard',
  'escalation',
  'fallback',
  'default',
] as const satisfies readonly RouteSource[]

/** The wire identity of one session id (the client's slot identity). */
export type TierAgentId = string

/** One registered model, as the configuration UI needs it. */
export interface TierModelInfo {
  readonly id: string
  readonly name: string
  readonly inputModalities: readonly string[]
}

/** One registered provider with its models. */
export interface TierCatalogProvider {
  readonly provider: string
  readonly models: readonly TierModelInfo[]
}

/** The live provider/model catalog served by `tier/catalog`. */
export type TierCatalog = readonly TierCatalogProvider[]

/** The session-scoped view of the routing state for one agent. */
export interface TierSessionView {
  /** The resolved agent id; null when no id was supplied or it is unknown. */
  readonly agentId: string | null
  /** The session override in force; null means "follow the composition mode". */
  readonly override: RoutingMode | null
  /** Effective mode: the override when set, otherwise the composition mode. */
  readonly mode: RoutingMode
  /** The tier the last request actually used for this agent, when known. */
  readonly appliedTier: TierId | null
  /** The layer that produced {@link TierSessionView.appliedTier}. */
  readonly appliedSource: RouteSource | null
  /** Whether a failure escalation is active right now. */
  readonly escalation: boolean
  /** Whether plan mode is active for this agent. */
  readonly plan: boolean
  /** Guard denials counted for this agent. */
  readonly denials: number
}

/**
 * The full `tier/status` payload: the host's public status snapshot plus the
 * session view. Structurally assignable to {@link AutotierStatus}, so a
 * consumer of the old shape keeps working unchanged.
 */
export interface TierStatus extends AutotierStatus {
  readonly session: TierSessionView
}

/** Strict wire schema for one tier landing. */
export const TIER_ROUTE_SCHEMA = z.object({
  provider: z.string(),
  model: z.string(),
  effort: z.enum(EFFORT_IDS).optional(),
})

/** Strict wire schema for the session view. */
export const TIER_SESSION_VIEW_SCHEMA = z.object({
  agentId: z.string().nullable(),
  override: z.enum(ROUTING_MODES).nullable(),
  mode: z.enum(ROUTING_MODES),
  appliedTier: z.enum(TIER_IDS).nullable(),
  appliedSource: z.enum(ROUTE_SOURCES).nullable(),
  escalation: z.boolean(),
  plan: z.boolean(),
  denials: z.number().int().min(0),
})

/** Strict wire schema for {@link TierStatus} (zod v4, both Typert faces). */
export const TIER_STATUS_SCHEMA = z.object({
  mode: z.enum(ROUTING_MODES),
  tiers: z.object({
    strong: TIER_ROUTE_SCHEMA,
    cheap: TIER_ROUTE_SCHEMA,
    vision: TIER_ROUTE_SCHEMA,
  }),
  guard: z.object({ enabled: z.boolean(), tiers: z.array(z.enum(TIER_IDS)) }),
  escalation: z.object({
    threshold: z.number().int().min(1),
    windowMs: z.number().int().min(0),
    ttlMs: z.number().int().min(0),
    fallbackTtlMs: z.number().int().min(0),
    signature: z.boolean(),
  }),
  session: TIER_SESSION_VIEW_SCHEMA,
})

/** Strict wire schema for {@link TierCatalog}. */
export const TIER_CATALOG_SCHEMA = z.array(z.object({
  provider: z.string(),
  models: z.array(z.object({
    id: z.string(),
    name: z.string(),
    inputModalities: z.array(z.string()),
  })),
}))

/** Strict wire schema for the optional agent id (missing decodes to `undefined`). */
export const TIER_AGENT_ID_SCHEMA = z.string().optional()

/** Strict wire schema for the routing mode parameter. */
export const TIER_MODE_SCHEMA = z.enum(ROUTING_MODES)

/** The optional trailing agent-id parameter both agent-addressed methods share. */
const AGENT_ID_PARAMETER = Object.freeze({
  name: 'agentId',
  wire: 'agentId',
  source: 'json',
  codec: Object.freeze({
    mode: 'strict',
    typeSymbol: 'dsh-autotier/wire#TierAgentId',
    schema: TIER_AGENT_ID_SCHEMA,
  }),
  acceptsUndefined: true,
} satisfies InvocationDescriptor['parameters'][number])

/** The strict result codec every `tier` method returns. */
const TIER_STATUS_RESULT = Object.freeze({
  mode: 'strict',
  typeSymbol: 'dsh-autotier/wire#TierStatus',
  schema: TIER_STATUS_SCHEMA,
} satisfies InvocationDescriptor['result'])

/** Diagnostics location shared by the hand-written descriptors below. */
const WIRE_LOCATION = Object.freeze({ file: 'src/wire.ts', line: 1, column: 1 })

/**
 * The `tier/status` invocation descriptor, shared verbatim by the host `TYPERT`
 * manifest and the client `TypertRemoteContribution`. The optional `agentId` is
 * the session id the slot props already carry; without it the host answers with
 * the composition mode and an empty session view.
 */
export const TIER_STATUS_DESCRIPTOR = Object.freeze({
  id: 'dsh-autotier#tier/status',
  service: 'tier',
  namespace: TIER_NAMESPACE,
  method: 'status',
  invocation: Object.freeze({ kind: 'direct' }),
  parameters: Object.freeze([AGENT_ID_PARAMETER]),
  result: TIER_STATUS_RESULT,
  sourceLocation: WIRE_LOCATION,
} as const) satisfies InvocationDescriptor

/**
 * The `tier/catalog` invocation descriptor: the live `ctx.llm` provider/model
 * registry, so the Settings card can list what is actually selectable.
 */
export const TIER_CATALOG_DESCRIPTOR = Object.freeze({
  id: 'dsh-autotier#tier/catalog',
  service: 'tier',
  namespace: TIER_NAMESPACE,
  method: 'catalog',
  invocation: Object.freeze({ kind: 'direct' }),
  parameters: Object.freeze([]),
  result: Object.freeze({
    mode: 'strict',
    typeSymbol: 'dsh-autotier/wire#TierCatalog',
    schema: TIER_CATALOG_SCHEMA,
  }),
  sourceLocation: WIRE_LOCATION,
} as const) satisfies InvocationDescriptor

/**
 * The `tier/setMode` invocation descriptor: the composer pill's cycle and the
 * Settings card's selector both write the *session* override for one agent
 * (`auto` clears it). Runtime only — a reload restores the composition mode.
 */
export const TIER_SET_MODE_DESCRIPTOR = Object.freeze({
  id: 'dsh-autotier#tier/setMode',
  service: 'tier',
  namespace: TIER_NAMESPACE,
  method: 'setMode',
  invocation: Object.freeze({ kind: 'direct' }),
  parameters: Object.freeze([
    Object.freeze({
      name: 'mode',
      wire: 'mode',
      source: 'json',
      codec: Object.freeze({
        mode: 'strict',
        typeSymbol: 'dsh-autotier/types#RoutingMode',
        schema: TIER_MODE_SCHEMA,
      }),
    } satisfies InvocationDescriptor['parameters'][number]),
    AGENT_ID_PARAMETER,
  ]),
  result: TIER_STATUS_RESULT,
  sourceLocation: WIRE_LOCATION,
} as const) satisfies InvocationDescriptor

/**
 * The canonical invocation list both Typert faces register — the host manifest
 * and the client contribution share these exact descriptor objects, so the two
 * wire codecs can never drift apart.
 */
export const TIER_INVOCATIONS = Object.freeze([
  TIER_STATUS_DESCRIPTOR,
  TIER_CATALOG_DESCRIPTOR,
  TIER_SET_MODE_DESCRIPTOR,
])
