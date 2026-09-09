/**
 * dsh-autotier: automatic strong/cheap model-tier routing for DeepSeek Harness.
 *
 * One user instruction enters, one tier decision comes out — with no manual
 * model switching. Complex intent is planned on the strong tier and implemented
 * on the cheap tier; simple intent is designed and implemented on the cheap
 * tier directly. High-risk tool calls are denied while the cheap tier executes,
 * and repeated failures escalate to the strong tier with a TTL fallback.
 *
 * The routing seam is the official `agent/request` waterfall: a listener
 * registered at load time on the root scope with `{ prepend: true }` runs
 * outermost, awaits `next()` exactly once, and returns a replacement
 * `LlmCallConfig` (provider/model/effort plus the preserved sampling scalars).
 *
 * @module dsh-autotier
 */

import type { Context } from '@deepseek-ai/cordis'
import { registerTierCommand } from './command.ts'
import { Config, resolveConfig, validateConfig, type Config as AutotierConfig } from './config.ts'
import { registerGuardHook } from './guard.ts'
import { AutotierRouter } from './routing.ts'
import { AutotierService } from './service.ts'
import { AgentStateStore, registerTierProjection } from './state.ts'
import { registerTierTools } from './tools.ts'

export { Config, resolveConfig, validateConfig } from './config.ts'
export type { Config as AutotierConfig, ResolvedConfig } from './config.ts'
export type {
  AutotierStatus,
  CostMode,
  EffortId,
  RouteDecision,
  RouteSource,
  RoutingMode,
  Scenario,
  TierId,
  TierRoute,
} from './types.ts'
export { EFFORT_IDS, ROUTING_MODES, SCENARIOS, TIER_IDS } from './types.ts'
export { AutotierService } from './service.ts'
export { AutotierRouter, applyEscalation } from './routing.ts'
export type { RouteProposal, RouteVeto, TierChange } from './routing.ts'
export { AgentStateStore, registerTierProjection, TIER_PROJECTION_KEY } from './state.ts'
export {
  classifyIntent,
  compileRules,
  computeSignals,
  evaluateRules,
  fingerprintOf,
  PosteriorTable,
  wilsonLowerBound,
} from './intent.ts'
export type { IntentInput, IntentResult, IntentSignals, Posterior, RuleHit } from './intent.ts'
export {
  attemptBandApplies,
  createRouteState,
  decideTier,
  escalationActive,
  judgeNeeded,
  noteFailure,
  noteFallback,
  noteJudgeCall,
} from './policy.ts'
export type { Decision, RouteState } from './policy.ts'
export {
  advanceFallback,
  classifyFallback,
  effortRank,
  escalationLadder,
  fallbackActive,
  nextEffortStep,
  resolveRoute,
  routeEquals,
} from './tiers.ts'
export type { EscalationRung, FallbackClass, FallbackRecord } from './tiers.ts'
export { JUDGE_LABELS, parseJudgeLabel, resolveJudgeRoute, runJudge } from './judge.ts'
export type { JudgeOutcome, JudgeRoute } from './judge.ts'
export { evaluateToolCall, registerGuardHook } from './guard.ts'
export type { GuardInput, GuardVerdict } from './guard.ts'
export {
  HIGH_IMPACT_COMMAND_RULES,
  HIGH_IMPACT_PATH_RULES,
  isCredentialPath,
  matchCommand,
  matchPath,
} from './guard-rules.ts'
export type { GuardMatch, GuardRule } from './guard-rules.ts'

/** The cordis.yml row id and the plugin name must match. */
export const name = 'dsh-autotier'

/**
 * Hard service dependencies. `sessions` is plural — the service name really is
 * `sessions` (`packages/core/session/src/index.ts` registers `super(ctx,
 * 'sessions')`); declaring a non-existent name would leave this plugin PENDING
 * forever. Every other capability (`agents`, `subagents`, `systemPrompt`,
 * `planMode`, `sessionProjections`, `sandboxPolicy`) is read with `ctx.get()`
 * and degrades when absent.
 */
export const inject = ['settings', 'llm', 'tools', 'commands', 'sessions']

/**
 * Mount the plugin: judge the configuration, register the `autotier` settings
 * namespace, publish the `ctx.autotier` service, and wire the routing listeners,
 * the `/tier` command and the two read-only tools.
 *
 * @param ctx - the plugin context.
 * @param config - the raw row configuration; every field is optional.
 * @throws {Error} when the configuration fails the cross-field judgement.
 */
export function apply(ctx: Context, config: AutotierConfig = {}): void {
  // Resolve first so a bad row fails at mount, before any namespace is
  // registered (fail loud, and leave no half-mounted state behind).
  const resolved = resolveConfig(config)
  // Consumer: the plugin reads and validates the shared settings namespace.
  const scope = ctx.settings.register('autotier', Config, {
    base: config,
    applies: 'live',
    validate: (value) => {
      validateConfig(value)
    },
  })
  const service = new AutotierService(ctx, { scope, config: resolved })
  registerTierProjection(ctx)
  const states = new AgentStateStore()
  new AutotierRouter({ ctx, service, states })
  registerGuardHook({ ctx, service, states })
  registerTierCommand(ctx, service, states)
  registerTierTools(ctx, { service, states })
  if (resolved.guard.interopDefend === 'auto' && ctx.get('defend') !== undefined) {
    // Coexistence is deliberate: dsh-defend owns content scanning (injection,
    // jailbreak, secrets) and the recursive-delete gate; autotier adds
    // tier-conditional denial and escalation guidance. Neither weakens the
    // other, and pass-through discipline keeps both in the chain.
    ctx.logger.info('dsh-autotier: dsh-defend detected; running side by side (guard.interopDefend=auto)')
  }
  const status = service.status()
  ctx.logger.info(
    'dsh-autotier: mode=%s strong=%s/%s cheap=%s/%s guard=%s',
    status.mode,
    status.tiers.strong.provider,
    status.tiers.strong.model,
    status.tiers.cheap.provider,
    status.tiers.cheap.model,
    status.guard.enabled ? 'on' : 'off',
  )
}
