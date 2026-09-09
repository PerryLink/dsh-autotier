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
import { Config, resolveConfig, validateConfig, type Config as AutotierConfig } from './config.ts'
import { AutotierService } from './service.ts'

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
 * namespace, and publish the `ctx.autotier` service.
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
