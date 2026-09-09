/**
 * The `tier` Typert Remote service: the browser half's only host entry point.
 * It exposes three methods over the shared wire vocabulary — `status` (the
 * host's public {@link AutotierStatus} plus the session view), `catalog` (the
 * live `ctx.llm` provider/model registry) and `setMode` (the session override).
 *
 * The override it writes is the very `RouteState.override` the router and the
 * `/tier` command already read, so the composer pill, the Settings card and the
 * command can never disagree; nothing here is persisted, and a reload restores
 * the composition mode.
 *
 * @module dsh-autotier/tier-remote
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { escalationActive } from './policy.ts'
import type { AutotierService } from './service.ts'
import type { AgentStateStore } from './state.ts'
import { ROUTING_MODES, type AutotierStatus, type RoutingMode } from './types.ts'
import { TIER_NAMESPACE, type TierCatalog, type TierSessionView, type TierStatus } from './wire.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The autotier Remote service (absent when the plugin is not composed). */
    tier: TierRemoteService
  }
}

/** The live bindings the Remote service reads; all owned by the plugin fiber. */
export interface TierRemoteBindings {
  /** The public read surface (`status`, `catalog`) this service fronts. */
  readonly service: AutotierService
  /** The per-agent runtime state store the router and `/tier` share. */
  readonly states: AgentStateStore
  /**
   * Resolve one live agent by its session id. Supplied by the plugin's `apply`
   * through the optional `agents` service, so this module never hard-depends on
   * it; an unresolvable id degrades the read and refuses the write.
   */
  readonly resolveAgent: (agentId: string) => Agent | undefined
}

/**
 * The `tier` Typert Remote service. Constructed by `src/index.ts` on the plugin
 * fiber; registering it removes it again on unload.
 */
export class TierRemoteService extends TypertRemoteService {
  /** No service dependencies: a pure surface over the injected bindings. */
  static inject = []

  /**
   * @param ctx - the owning plugin context.
   * @param bindings - the read surface, the shared state store and the agent resolver.
   */
  constructor(
    ctx: Context,
    private readonly bindings: TierRemoteBindings,
  ) {
    super(ctx, TIER_NAMESPACE)
  }

  /**
   * The status snapshot for one session.
   * @param agentId - the calling session/agent id; omitted reads the composition mode only.
   * @returns the host status plus the session view (empty when the id is absent or unknown).
   */
  status(agentId?: string): TierStatus {
    const base = this.bindings.service.status()
    return { ...base, session: this.viewFor(agentId, base) }
  }

  /**
   * The registered provider/model catalog, straight from the live `ctx.llm`
   * registry — never hardcoded, so a model the adapter does not advertise
   * cannot appear.
   * @returns one entry per registered provider with its models.
   */
  async catalog(): Promise<TierCatalog> {
    return this.bindings.service.catalog()
  }

  /**
   * Set the session override for one agent and return the refreshed status.
   * `auto` clears the override; every other mode pins the session. Runtime only.
   * @param mode - the routing mode to pin, or `auto` to follow the composition mode.
   * @param agentId - the calling session/agent id (required: the override is per agent).
   * @returns the refreshed status for that agent.
   * @throws {TypeError} when the mode is outside the routing vocabulary.
   * @throws {Error} when no agent id is supplied or the id names no live agent.
   */
  setMode(mode: RoutingMode, agentId?: string): TierStatus {
    if (!ROUTING_MODES.includes(mode)) {
      throw new TypeError(`tier.setMode: unknown routing mode ${JSON.stringify(mode)}`)
    }
    if (agentId === undefined || agentId === '') {
      throw new Error('tier.setMode requires the calling session id (agentId)')
    }
    const agent = this.bindings.resolveAgent(agentId)
    if (agent === undefined) {
      throw new Error(`tier.setMode: no live agent for session ${JSON.stringify(agentId)}`)
    }
    const state = this.bindings.states.for(agent)
    state.override = mode === 'auto' ? undefined : mode
    this.ctx.logger.info('dsh-autotier: session %s routing mode set to %s via the client', agentId, mode)
    return this.status(agentId)
  }

  /** Project the shared per-agent runtime state onto the wire view. */
  private viewFor(agentId: string | undefined, base: AutotierStatus): TierSessionView {
    const id = agentId === undefined || agentId === '' ? null : agentId
    const resolved = id === null ? undefined : this.bindings.resolveAgent(id)
    if (resolved === undefined) {
      return {
        agentId: id,
        override: null,
        mode: base.mode,
        appliedTier: null,
        appliedSource: null,
        escalation: false,
        plan: false,
        denials: 0,
      }
    }
    const state = this.bindings.states.for(resolved)
    const override = state.override ?? null
    return {
      agentId: id,
      override,
      mode: override ?? base.mode,
      appliedTier: state.appliedTier ?? null,
      appliedSource: state.appliedSource ?? null,
      escalation: escalationActive(state, Date.now()),
      plan: state.planActive,
      denials: state.denials,
    }
  }
}
