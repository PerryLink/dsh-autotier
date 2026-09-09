/**
 * Per-agent routing state and the replayable tier projection.
 *
 * Two different kinds of state live here, on purpose:
 *
 * - **Runtime state** (escalation counters, fallback position, judge cooldown,
 *   the per-input decision cache, the hysteresis anchor) is mutable and NOT
 *   derivable from the session log, so it lives in a `WeakMap<Agent, RouteState>`.
 *   `ctx.sessionProjections` is a read-only fold registry — it exposes
 *   `register`/`stateOf`/`snapshot` and has no setter — so runtime state cannot
 *   live there; the earlier design note that said otherwise is corrected here.
 * - **Derived state** (which route the last request actually used, and whether
 *   plan mode is active) IS a pure fold over `request/header` and `plan/mode`,
 *   so it is registered as a host+wire projection key. That makes the effective
 *   tier replayable from the log and visible to clients.
 *
 * @module dsh-autotier/state
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
// Type-only import: pulls the `plan/mode` SessionEventMap augmentation the host
// plan-mode package declares. Erased at runtime, so the peer stays optional.
import type {} from '@deepseek-ai/dsh-plan-mode'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { createRouteState, type RouteState } from './policy.ts'

/** The projection key autotier owns. */
export const TIER_PROJECTION_KEY = 'autotier'

/** Host fold state for the tier projection (plain JSON by contract). */
export interface TierProjectionState {
  provider: string
  model: string
  /** Empty string = the route carries no explicit effort. */
  effort: string
  plan: boolean
}

/**
 * The subset of `ctx.sessionProjections` this plugin uses. Typed structurally
 * on purpose: the service is an optional peer, so the plugin must not depend on
 * its declaration-merged key table at type level (a consumer without the peer
 * would fail to type-check). The runtime contract is the same.
 */
interface ProjectionRegistryLike {
  register(definition: {
    key: string
    stateVersion: number
    stateSchema: { parse(value: unknown): unknown }
    init: (header: unknown, inheritedEventCount: number) => TierProjectionState
    apply: (state: TierProjectionState, event: SessionEvent) => TierProjectionState
    wire: {
      viewSchema: { parse(value: unknown): unknown }
      view(state: TierProjectionState): TierProjectionState
    }
  }): () => void
  stateOf(session: Session, key: string): TierProjectionState | undefined
}

/** Minimal zod-compatible schemas for the projection state and wire view. */
const projectionSchema = {
  parse(value: unknown): TierProjectionState {
    const record = (value ?? {}) as Record<string, unknown>
    return {
      provider: typeof record.provider === 'string' ? record.provider : '',
      model: typeof record.model === 'string' ? record.model : '',
      effort: typeof record.effort === 'string' ? record.effort : '',
      plan: record.plan === true,
    }
  },
}

/**
 * Register the tier projection when the registry is composed.
 * @param ctx - the plugin context; the registration rides its fiber.
 * @returns the registration disposer, or undefined when the registry is absent.
 */
export function registerTierProjection(ctx: Context): (() => void) | undefined {
  const registry = ctx.get('sessionProjections') as unknown as ProjectionRegistryLike | undefined
  if (registry === undefined) {
    ctx.logger.warn('dsh-autotier: sessionProjections is absent; the replayable tier projection is disabled')
    return undefined
  }
  return registry.register({
    key: TIER_PROJECTION_KEY,
    stateVersion: 1,
    stateSchema: projectionSchema,
    init: () => ({ provider: '', model: '', effort: '', plan: false }),
    apply: (state, event) => {
      if (event.type === 'plan/mode') {
        const plan = (event.data as { active?: unknown }).active === true
        return plan === state.plan ? state : { ...state, plan }
      }
      if (event.type !== 'request/header') return state
      const config = (event.data as { header?: { config?: { provider?: unknown; model?: unknown; reasoningEffort?: unknown } } })
        .header?.config
      if (config === undefined) return state
      const next: TierProjectionState = {
        provider: typeof config.provider === 'string' ? config.provider : '',
        model: typeof config.model === 'string' ? config.model : '',
        effort: typeof config.reasoningEffort === 'string' ? config.reasoningEffort : '',
        plan: state.plan,
      }
      const same = next.provider === state.provider && next.model === state.model
        && next.effort === state.effort && next.plan === state.plan
      return same ? state : next
    },
    wire: {
      viewSchema: projectionSchema,
      view: state => state,
    },
  })
}

/** The per-agent runtime state store. */
export class AgentStateStore {
  private readonly states = new WeakMap<Agent, RouteState>()

  /** The state for one agent, created on first use. */
  for(agent: Agent): RouteState {
    let state = this.states.get(agent)
    if (state === undefined) {
      state = createRouteState()
      this.states.set(agent, state)
    }
    return state
  }

  /** Whether one agent already has state (diagnostics). */
  has(agent: Agent): boolean {
    return this.states.has(agent)
  }
}
