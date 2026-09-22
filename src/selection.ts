/**
 * Session-selection synchronisation.
 *
 * Two harness facts drive this module:
 *
 * 1. The GUI's model picker reads and writes the `agent-default-model`
 *    configuration, so a router that changes the tier must mirror the change
 *    there — otherwise the picker shows a model nobody is using. The mirror is
 *    best-effort: without `agentDefaultModel` it degrades to a no-op.
 * 2. A user's explicit choice must win. When the documented selection changes
 *    to a value this module did not write, every live session switches to
 *    `delegated` (routing stops) until `/tier auto`.
 *
 * Fact 2 used to ride the settings service's `settings/updated` commit event.
 * That event no longer exists: the `0.1.6`-generation host replaced the
 * settings *provider* with `SettingsForms` (a schema→form projector), so a
 * plugin can no longer observe another plugin's document. What survives is the
 * `agentDefaultModel` service itself, which now answers `currentSelection()` by
 * reading its own live `Volatile` fields.
 *
 * Detection is therefore a comparison rather than a subscription: {@link
 * SelectionSync.observeExternalSelection} freshly reads the documented selection
 * and delegates when it differs from the value this module last wrote. It runs
 * on the path that would otherwise overwrite the user — immediately before a
 * tier is mirrored — so a user's pick can never be silently replaced by a
 * routing decision, which is the property the old subscription protected.
 *
 * @module dsh-autotier/selection
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { AgentStateStore } from './state.ts'
import type { TierRoute } from './types.ts'

/** The subset of `ctx.agentDefaultModel` this module uses. */
interface DefaultModelService {
  /** Read the currently documented selection. */
  currentSelection(): { provider: string; model: string; reasoningEffort?: string }
  saveSelection(next: { provider: string; model: string; reasoningEffort?: string }): Promise<void>
}

/** The `agents` registry subset used to find live sessions. */
interface AgentRegistry {
  list(): Agent[]
}

/** Key of one selection, for comparing our own writes with external ones. */
function selectionKey(value: unknown): string {
  if (value === null || typeof value !== 'object') return ''
  const record = value as { provider?: unknown; model?: unknown; reasoningEffort?: unknown }
  const provider = typeof record.provider === 'string' ? record.provider : ''
  const model = typeof record.model === 'string' ? record.model : ''
  const effort = typeof record.reasoningEffort === 'string' ? record.reasoningEffort : ''
  return `${provider}/${model}@${effort}`
}

/** Options for {@link SelectionSync}. */
export interface SelectionSyncOptions {
  readonly ctx: Context
  readonly states: AgentStateStore
}

/**
 * Mirrors the applied tier into the default-model document and honours an
 * external change by delegating every live session.
 */
export class SelectionSync {
  private readonly ctx: Context
  private readonly states: AgentStateStore
  /** The selection this plugin last wrote; used to tell our write from a user's. */
  private selfWrite: string | undefined

  /** @param options - the plugin context and the per-agent state store. */
  constructor(options: SelectionSyncOptions) {
    this.ctx = options.ctx
    this.states = options.states
  }

  /** The optional default-model service. */
  private get defaultModel(): DefaultModelService | undefined {
    return this.ctx.get('agentDefaultModel') as DefaultModelService | undefined
  }

  /**
   * Read the documented selection and delegate every live session when it is
   * no longer the value this module wrote.
   *
   * Before this module's first write nothing is delegated, whatever the
   * document holds: at that point "not ours" describes the composition default
   * and any selection the user made before the plugin ever routed, and neither
   * is an override of a routing decision. Once this module owns a write, any
   * divergence is by construction somebody else's edit.
   */
  observeExternalSelection(): void {
    if (this.selfWrite === undefined) return
    const service = this.defaultModel
    if (service === undefined) return
    let current: unknown
    try {
      current = service.currentSelection()
    } catch (error) {
      this.ctx.logger.debug('dsh-autotier: could not read the default-model selection: %o', error)
      return
    }
    const key = selectionKey(current)
    if (key === this.selfWrite) return
    this.delegateLiveSessions(key)
  }

  /**
   * Mirror one applied landing into the default-model document. An external
   * change to that document is honoured first, so routing never overwrites the
   * model the user picked. Repeated landings with the same value are skipped,
   * so a long cheap run writes once.
   * @param route - the landing actually applied.
   */
  noteRoute(route: TierRoute): void {
    const service = this.defaultModel
    if (service === undefined) return
    this.observeExternalSelection()
    const selection = {
      provider: route.provider,
      model: route.model,
      ...route.effort === undefined ? {} : { reasoningEffort: route.effort },
    }
    const key = selectionKey(selection)
    if (this.selfWrite === key) return
    this.selfWrite = key
    void service.saveSelection(selection).catch((error: unknown) => {
      this.selfWrite = undefined
      this.ctx.logger.debug('dsh-autotier: could not mirror the tier into the default-model document: %o', error)
    })
  }

  /**
   * An external change to the default model wins: stop routing for every live
   * session until the user asks for `auto` again.
   */
  private delegateLiveSessions(key: string): void {
    const agents = this.ctx.get('agents') as AgentRegistry | undefined
    if (agents === undefined) return
    let changed = 0
    for (const agent of agents.list()) {
      const state = this.states.for(agent)
      if (state.override === 'off' || state.override === 'delegated') continue
      state.override = 'delegated'
      changed += 1
    }
    if (changed > 0) {
      this.ctx.logger.info(
        'dsh-autotier: the default model selection changed to %s; %d live session(s) switched to delegated (use /tier auto to resume routing)',
        key === '' ? '<unknown>' : key,
        changed,
      )
    }
  }
}
