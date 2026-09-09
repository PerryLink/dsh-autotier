/**
 * The routing wiring: the listeners that turn a classification into a tier, and
 * the failure/fallback handlers that keep a cheap run alive.
 *
 * Every registration is an effect on the plugin fiber. The request listener is
 * registered at load time on the root scope with `{ prepend: true }` so it wraps
 * the official `installModelSelection` listener (registered later, during agent
 * setup) and its replacement wins. It always awaits `next()` exactly once and
 * never returns `undefined`: the inner listener destructures the result without
 * a guard.
 *
 * @module dsh-autotier/routing
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm'
// Type-only import for the `plan/mode` SessionEventMap augmentation.
import type {} from '@deepseek-ai/dsh-plan-mode'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ResolvedConfig } from './config.ts'
import { classifyIntent, evaluateRules, type IntentInput, type IntentResult } from './intent.ts'
import { runJudge } from './judge.ts'
import {
  attemptBandApplies,
  clearExpiredEscalation,
  decideTier,
  escalationActive,
  judgeNeeded,
  noteFailure,
  noteFallback,
  noteJudgeCall,
  type Decision,
  type RouteState,
} from './policy.ts'
import type { AutotierService } from './service.ts'
import type { AgentStateStore } from './state.ts'
import { classifyFallback, EFFORT_LADDER, effortRank, escalationLadder, resolveRoute } from './tiers.ts'
import type { RouteSource, TierId, TierRoute } from './types.ts'

/** One proposed tier, offered to third parties on the `autotier/route` event. */
export interface RouteProposal {
  readonly agent: Agent
  readonly turn: number
  readonly step: number
  readonly tier: TierId
  readonly source: RouteSource
  readonly reason: string
  readonly confidence: number
}

/** A third party's replacement tier. Returning one from a listener vetoes. */
export interface RouteVeto {
  readonly tier: TierId
  readonly reason: string
}

/** Emitted whenever the effective tier changes. */
export interface TierChange {
  readonly agent: Agent
  readonly from: TierId | undefined
  readonly to: TierId
  readonly source: RouteSource
  readonly reason: string
  readonly route: TierRoute
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * Serial veto over one proposed tier. Listeners run in order and the first
     * one returning a {@link RouteVeto} replaces the proposal.
     * @mode serial
     */
    'autotier/route'(proposal: RouteProposal): RouteVeto | void | Promise<RouteVeto | void>
    /**
     * The effective tier changed for one agent.
     * @mode emit
     */
    'autotier/tier-changed'(payload: TierChange): void
  }
}

/** Options for {@link AutotierRouter}. */
export interface RouterOptions {
  readonly ctx: Context
  readonly service: AutotierService
  readonly states: AgentStateStore
}

/** How long third parties have to veto a proposed tier before the turn proceeds. */
const VETO_TIMEOUT_MS = 250

/** Extract the plain text of one message's content blocks. */
function textOf(content: readonly { type: string; text?: string }[]): string {
  return content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
}

/** The error code of a thrown value, when it carries one. */
function codeOf(error: unknown): string {
  if (error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string') return error.code
  return 'UNKNOWN'
}

/** Whether a classified intent is complex enough to open plan mode. */
function shouldPlan(intent: IntentResult): boolean {
  if (intent.tier !== 'strong') return false
  if (intent.scenario === 'review') return false
  return intent.scenario === 'planning' || intent.signals.score >= 3
}

/** The router owns every autotier listener. */
export class AutotierRouter {
  private readonly ctx: Context
  private readonly service: AutotierService
  private readonly states: AgentStateStore
  private readonly pendingJudges = new Set<Promise<void>>()
  /** Per-session classifier counters, keyed by session so no agent registry is needed. */
  private readonly counters = new WeakMap<Session, { toolNames: string[]; messageCount: number }>()
  /** Router-owned lifetime signal: aborts in-flight judge calls on unload. */
  private readonly lifetime = new AbortController()
  private disposed = false

  /**
   * Register every listener on the plugin fiber.
   * @param options - the plugin context, the service and the state store.
   */
  constructor(options: RouterOptions) {
    this.ctx = options.ctx
    this.service = options.service
    this.states = options.states
    this.ctx.on('agent/inbox/inserted', payload => this.onInboxInserted(payload.agent, payload.message), { prepend: true })
    this.ctx.on('agent/request', (payload, next) => this.onRequest(payload.agent, payload.turn, payload.step, next), { prepend: true })
    this.ctx.on('agent/error', payload => this.onAgentError(payload.agent, payload.error))
    this.ctx.on('agent/request-error', (payload, next) => this.onRequestError(payload.agent, payload.provider, payload.failure, next))
    this.ctx.on('session/event', (session, event) => this.onSessionEvent(session, event))
    this.ctx.effect(() => () => {
      this.disposed = true
      this.lifetime.abort()
    })
  }

  /** Pending judge calls (diagnostics and tests). */
  get judgeCallsInFlight(): number {
    return this.pendingJudges.size
  }

  /** The classifier input for one agent. */
  private inputFor(agent: Agent, text: string, hasImage: boolean): IntentInput {
    const counters = this.counterFor(agent.session)
    return {
      text,
      toolNames: counters.toolNames,
      hasImage,
      messageCount: counters.messageCount,
      cwd: agent.session.header.cwd ?? '',
    }
  }

  /** The per-session classifier counters, created on first use. */
  private counterFor(session: Session): { toolNames: string[]; messageCount: number } {
    let counters = this.counters.get(session)
    if (counters === undefined) {
      counters = { toolNames: [], messageCount: 0 }
      this.counters.set(session, counters)
    }
    return counters
  }

  /** The routing mode in force for one agent. */
  private modeFor(agent: Agent): ResolvedConfig['routingMode'] {
    return this.states.for(agent).override ?? this.service.config().routingMode
  }

  /** Capture the newest user input, classify it, and start the judge when needed. */
  private onInboxInserted(agent: Agent, message: { source?: { kind?: string }; content?: readonly { type: string; text?: string }[] }): void {
    if (message.source?.kind !== 'user') return
    const text = textOf(message.content ?? [])
    const hasImage = (message.content ?? []).some(block => block.type === 'image')
    const state = this.states.for(agent)
    const config = this.service.config()
    const input = this.inputFor(agent, text, hasImage)
    state.input = input
    state.decision = classifyIntent(input, { rules: this.service.rules(), scenarios: config.intent.scenarios })
    state.verified = false
    // `reviewOwedFor` deliberately survives a new input: a cheap attempt that
    // hit a signal still owes one strong pass for that shape of request, and a
    // turn-ending failure has no later step in its own turn to spend it on.
    // The posterior opinion (with its exploration roll) is taken once per user
    // input; every step of the turn reuses it.
    const probe = this.service.posteriors().verdict(state.decision.fingerprint)
    state.probe = probe ?? undefined
    if (this.modeFor(agent) !== 'auto') return
    const rule = evaluateRules(this.service.rules(), input)
    if (shouldPlan(state.decision) && !state.planActive) this.enterPlanMode(agent)
    if (judgeNeeded(config, state, state.decision, rule, Date.now())) {
      this.startJudge(agent, config, text, state.decision)
    }
  }

  /** Fire the judge without blocking the emit dispatch. */
  private startJudge(agent: Agent, config: ResolvedConfig, text: string, local: IntentResult): void {
    const state = this.states.for(agent)
    // Arm the cooldown before the call: a second input arriving while this one
    // is still in flight must not start a second judge.
    state.judge.lastCall = Date.now()
    const signal = this.lifetime.signal
    // The decision object is the generation token: a newer input replaces
    // `state.decision`, and a stale judge answer must not overwrite it.
    const generation = local
    const task = runJudge(this.ctx, config, text, signal).then((outcome) => {
      if (this.disposed) return
      noteJudgeCall(state, Date.now(), outcome.ok)
      if (state.decision !== generation) return
      if (!outcome.ok || outcome.tier === undefined || outcome.scenario === undefined) {
        this.ctx.logger.debug('dsh-autotier: judge abstained (%s); keeping the local verdict', outcome.detail)
        return
      }
      // The judge refines the classifier's verdict; it never overrides an
      // explicit short-circuit or a rule hit.
      state.decision = {
        ...local,
        scenario: outcome.scenario,
        tier: outcome.tier,
        confidence: 0.75,
        reasons: [...local.reasons, outcome.detail],
      }
    }).catch((error: unknown) => {
      if (this.disposed) return
      noteJudgeCall(state, Date.now(), false)
      this.ctx.logger.warn('dsh-autotier: judge call failed: %o', error)
    }).finally(() => {
      this.pendingJudges.delete(task)
    })
    this.pendingJudges.add(task)
  }

  /** Open plan mode through the service, or through the log when it is absent. */
  private enterPlanMode(agent: Agent): void {
    const planMode = this.ctx.get('planMode') as { set(agent: Agent, active: boolean): string } | undefined
    const state = this.states.for(agent)
    if (planMode !== undefined) {
      try {
        const outcome = planMode.set(agent, true)
        if (outcome !== 'noop') {
          state.planActive = true
          this.ctx.logger.info('dsh-autotier: plan mode %s for a complex instruction', outcome)
        }
        return
      } catch (error) {
        this.ctx.logger.warn('dsh-autotier: planMode.set failed (%o); falling back to the session log', error)
      }
    }
    try {
      agent.session.append('plan/mode', { active: true })
      state.planActive = true
    } catch (error) {
      this.ctx.logger.warn('dsh-autotier: could not open plan mode (%o)', error)
    }
  }

  /**
   * Offer the proposal to third parties on the `autotier/route` serial event.
   * A listener failure is contained, and a listener that never settles cannot
   * stall the turn: the race resolves with our own decision after the timeout.
   * The timer is owned by `ctx.effect`, so unloading clears it (no HMR leak).
   */
  private async serialVeto(proposal: RouteProposal): Promise<RouteVeto | void> {
    const deadline = new Promise<undefined>((resolve) => {
      this.ctx.effect(() => {
        const timer = setTimeout(() => { resolve(undefined) }, VETO_TIMEOUT_MS)
        return () => { clearTimeout(timer) }
      })
    })
    const offered = this.ctx.serial('autotier/route', proposal).catch((error: unknown) => {
      this.ctx.logger.warn('dsh-autotier: autotier/route listener failed: %o', error)
      return undefined
    })
    return Promise.race([offered, deadline])
  }

  /** The tier landing for one tier, resolving the vision override, an active
   * fallback record, and the effort-first escalation ladder.
   *
   * The ladder is the point of escalation: raise the current model's effort one
   * step at a time (the KV prefix survives and the official notice stays quiet
   * for an effort-only change) before paying for a model switch. `rung` counts
   * how many times escalation has triggered for this agent, so repeated failures
   * walk the ladder instead of jumping to the strongest landing.
   */
  private routeFor(
    tier: TierId,
    config: ResolvedConfig,
    intent: IntentResult | undefined,
    state: RouteState,
    now: number,
    base?: LlmCallConfig,
  ): TierRoute {
    if (intent?.signals !== undefined && intent.shortCircuit === 'image') {
      const vision = config.tiers.vision
      return { provider: vision.provider, model: vision.model }
    }
    const entry = tier === 'strong' ? config.tiers.strong : config.tiers.cheap
    // An active fallback record pins the agent to one chain entry; the tier's
    // effort still applies, so a fallback model keeps the intended reasoning
    // budget.
    if (state.fallback !== undefined && state.fallback.tier === tier && state.fallback.until > now) {
      const chainEntry = entry.fallback[state.fallback.index]
      if (chainEntry !== undefined) {
        const floor = entry.followSession && base?.reasoningEffort !== undefined ? undefined : entry.effort
        return floor === undefined
          ? { provider: chainEntry.provider, model: chainEntry.model }
          : { provider: chainEntry.provider, model: chainEntry.model, effort: floor }
      }
    }
    if (tier === 'strong' && state.escalation !== undefined && state.escalation.until > now) {
      // The ladder is a property of the tier configuration, so it is always
      // computed from the cheap tier's own landing — computing it from the
      // current request config would drift upward as each rung lands and make
      // the rung counter skip entries.
      const cheapLanding = this.tierRoute('cheap', config)
      const ladder = escalationLadder(cheapLanding, cheapLanding, this.tierRoute('strong', config))
      let index = Math.min(Math.max(state.escalation.rung - 1, 0), Math.max(ladder.length - 1, 0))
      // Never lower the effort the session already carries: skip rungs that
      // would step below the current request's effort.
      const currentRank = effortRank(base?.reasoningEffort ?? cheapLanding.effort ?? 'low')
      while (index < ladder.length - 1) {
        const candidate = ladder[index]
        const candidateRank = candidate?.route.effort === undefined ? EFFORT_LADDER.length : effortRank(candidate.route.effort)
        if (candidateRank >= currentRank) break
        index += 1
      }
      const rung = ladder[index]
      if (rung !== undefined) return rung.route
    }
    return this.tierRoute(tier, config, base)
  }

  /**
   * The configured landing of one tier. `followSession` means the session's own
   * effort wins when it has one; when it has none, the tier's configured effort
   * is the floor (an omitted effort would fall through to the adapter default,
   * which is the strongest level).
   */
  private tierRoute(tier: TierId, config: ResolvedConfig, base?: LlmCallConfig): TierRoute {
    const entry = tier === 'strong' ? config.tiers.strong : config.tiers.cheap
    if (!entry.followSession) {
      return { provider: entry.provider, model: entry.model, effort: entry.effort }
    }
    if (base?.reasoningEffort === undefined && entry.effort !== undefined) {
      return { provider: entry.provider, model: entry.model, effort: entry.effort }
    }
    return { provider: entry.provider, model: entry.model }
  }

  /** Resolve the tier for this step and apply it to the proposed configuration. */
  private async onRequest(
    agent: Agent,
    turn: number,
    step: number,
    next: () => Promise<LlmCallConfig>,
  ): Promise<LlmCallConfig> {
    const base = await next()
    try {
      return await this.routeRequest(agent, turn, step, base)
    } catch (error) {
      // The request seam must never break a turn: a routing defect degrades to
      // the session's own configuration and is reported loudly.
      this.ctx.logger.error('dsh-autotier: routing failed, using the session configuration: %o', error)
      return base
    }
  }

  /** The routing body, separated so one try/catch guards the whole seam. */
  private async routeRequest(agent: Agent, turn: number, step: number, base: LlmCallConfig): Promise<LlmCallConfig> {
    const mode = this.modeFor(agent)
    if (mode === 'off' || mode === 'delegated') return base
    const state = this.states.for(agent)
    const config = this.service.config()
    const now = Date.now()
    clearExpiredEscalation(state, now)
    const intent = state.decision
    if (intent === undefined) return base
    const rule = state.input === undefined ? null : evaluateRules(this.service.rules(), state.input)
    let decision: Decision = decideTier({
      config,
      state,
      intent,
      rule,
      override: state.override,
      now,
    })
    // Attempt-first band: only a classifier-driven verdict may be downgraded —
    // an explicit rule, plan mode, escalation or manual override wins outright.
    const classifierDriven = decision.source === 'judge' || decision.source === 'default'
    if (classifierDriven && attemptBandApplies(config, intent) && !state.verified && !escalationActive(state, now)) {
      decision = {
        tier: 'cheap',
        source: 'default',
        reason: `${intent.reasons.join('; ')}; attempt-first band`,
        confidence: intent.confidence,
      }
    }
    // Attempt-first review: a cheap-run signal owes one strong pass for the
    // SAME SHAPE of request (fingerprint), so an unrelated later task neither
    // inherits nor spends it.
    if (state.reviewOwedFor !== undefined && state.reviewOwedFor === intent.fingerprint && !state.verified) {
      state.verified = true
      state.reviewOwedFor = undefined
      decision = {
        tier: 'strong',
        source: 'escalation',
        reason: 'attempt-first strong review',
        confidence: 1,
      }
    }
    const proposal: RouteProposal = {
      agent,
      turn,
      step,
      tier: decision.tier,
      source: decision.source,
      reason: decision.reason,
      confidence: decision.confidence,
    }
    const veto = await this.serialVeto(proposal)
    const tier = veto?.tier ?? decision.tier
    const source: RouteSource = veto === undefined || veto === null ? decision.source : 'manual'
    const reason = veto === undefined || veto === null ? decision.reason : `veto: ${veto.reason}`
    const route = this.routeFor(tier, config, intent, state, now, base)
    const applied = resolveRoute(base, route)
    if (state.appliedTier !== tier) {
      const from = state.appliedTier
      state.appliedTier = tier
      state.appliedSource = source
      this.ctx.emit('autotier/tier-changed', { agent, from, to: tier, source, reason, route })
    } else {
      state.appliedSource = source
    }
    this.ctx.logger.debug(
      'dsh-autotier: turn=%d step=%d tier=%s source=%s (%s)',
      turn,
      step,
      tier,
      source,
      reason,
    )
    return applied
  }

  /** Count failures and escalate on the configured signature recurrence. */
  private onAgentError(agent: Agent, error: unknown): void {
    const mode = this.modeFor(agent)
    // Failures in a session that opted out of routing are not ours to count.
    if (mode === 'off' || mode === 'delegated') return
    const state = this.states.for(agent)
    const config = this.service.config()
    const signature = `${codeOf(error)}|${state.decision?.fingerprint ?? ''}`
    const now = Date.now()
    // An attempt-first turn that hits a signal owes one strong review for the
    // SAME decision (a later input is a different task and must re-earn it).
    if (state.decision !== undefined && attemptBandApplies(config, state.decision) && !state.verified) {
      state.reviewOwedFor = state.decision.fingerprint
    }
    const alreadyEscalated = escalationActive(state, now)
    // Escalation is a cheap-tier remedy: a strong-tier failure is not evidence
    // that the cheap tier was wrong.
    const failedTier = state.appliedTier ?? 'cheap'
    if (failedTier !== 'cheap' && !alreadyEscalated) return
    const escalatedNow = noteFailure(state, signature, config, now)
    if (escalatedNow && !alreadyEscalated) {
      const tier = this.routeFor('strong', config, state.decision, state, now)
      this.ctx.logger.warn(
        'dsh-autotier: escalating after %d recurring failure(s) (%s) -> %s/%s',
        state.escalation?.count ?? 0,
        signature,
        tier.provider,
        tier.model,
      )
      this.ctx.emit('autotier/tier-changed', {
        agent,
        from: state.appliedTier,
        to: 'strong',
        source: 'escalation',
        reason: signature,
        route: tier,
      })
    }
    if (state.decision !== undefined) {
      this.service.posteriors().record(state.decision.fingerprint, state.appliedTier ?? 'cheap', false, now)
    }
  }

  /**
   * Walk the tier's fallback chain. Permanent codes switch immediately;
   * transient codes wait for `dsh-llm-retry` to exhaust its own retries first
   * (this listener is registered after it on purpose).
   */
  private async onRequestError(
    agent: Agent,
    provider: string,
    failure: { code?: unknown; status?: unknown },
    next: () => Promise<{ kind: 'retry' } | undefined>,
  ): Promise<{ kind: 'retry' } | undefined> {
    const mode = this.modeFor(agent)
    // A session that opted out of routing keeps its own failure handling: the
    // chain is autotier's, so it must not re-dispatch a route we do not own.
    if (mode === 'off' || mode === 'delegated') return next()
    const config = this.service.config()
    const verdict = classifyFallback(failure)
    if (verdict === 'ignore' || verdict === 'unknown') return next()
    const state = this.states.for(agent)
    const tier: TierId = escalationActive(state, Date.now()) ? 'strong' : (state.appliedTier ?? 'cheap')
    const chain = tier === 'strong' ? config.tiers.strong.fallback : config.tiers.cheap.fallback
    if (chain.length === 0) return next()
    if (verdict === 'transient') {
      const downstream = await next()
      if (downstream !== undefined) return downstream
    }
    const now = Date.now()
    if (noteFallback(state, tier, chain.length, config, now)) {
      this.ctx.logger.warn(
        'dsh-autotier: provider "%s" failed with %s; switching to fallback entry %d of the %s tier',
        provider,
        String(typeof failure.code === 'string' ? failure.code : `status ${String(failure.status ?? '?')}`),
        (state.fallback?.index ?? 0) + 1,
        tier,
      )
      return { kind: 'retry' }
    }
    return next()
  }

  /** Maintain the classifier counters and the plan-mode fallback fold. */
  private onSessionEvent(session: Session, event: SessionEvent): void {
    const counters = this.counterFor(session)
    if (event.type === 'user/message') {
      counters.messageCount += 1
      return
    }
    if (event.type === 'tool/call') {
      const name = (event.data as { name?: unknown }).name
      if (typeof name === 'string' && !counters.toolNames.includes(name)) counters.toolNames.push(name)
      return
    }
    if (event.type === 'plan/mode') {
      const agent = this.agentOf(session)
      if (agent !== undefined) this.states.for(agent).planActive = (event.data as { active?: unknown }).active === true
      return
    }
    if (event.type === 'turn/end') {
      const reason = (event.data as { reason?: { kind?: unknown } }).reason?.kind
      const agent = this.agentOf(session)
      if (agent === undefined) return
      const state = this.states.for(agent)
      if (reason === 'completed' && state.decision !== undefined) {
        this.service.posteriors().record(state.decision.fingerprint, state.appliedTier ?? 'cheap', true, Date.now())
      }
    }
  }

  /** Resolve the agent that owns one session, when the registry is reachable. */
  private agentOf(session: Session): Agent | undefined {
    const agents = this.ctx.get('agents')
    if (agents === undefined) return undefined
    try {
      return agents.get(session.id)
    } catch {
      return undefined
    }
  }
}
