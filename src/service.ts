/**
 * `ctx.autotier`: the Service Provider for autotier's public read surface. The
 * service owns the live resolved configuration and serves the status snapshot
 * that `/tier status`, the `tier_status` tool and any third-party consumer read.
 * Routing decisions themselves live in the policy module; this class is the
 * stable contract other plugins may depend on.
 * @module dsh-autotier/service
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { resolveConfig, type Config, type ResolvedConfig } from './config.ts'
import type { AutotierStatus, EffortId, RoutingMode, TierRoute } from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The autotier routing service (absent when the plugin is not composed). */
    autotier: AutotierService
  }
}

/** Dependencies the service needs from the plugin's `apply`. */
export interface AutotierServiceOptions {
  /** The live settings scope; its value is re-resolved on every committed change. */
  scope: SettingsScope<Config>
  /** The configuration resolved at mount time (the composition base layer). */
  config: ResolvedConfig
}

/** Project one resolved tier config onto the public route shape. */
function routeOf(tier: { provider: string; model: string; effort: EffortId; followSession: boolean }): TierRoute {
  if (tier.followSession) return { provider: tier.provider, model: tier.model }
  return { provider: tier.provider, model: tier.model, effort: tier.effort }
}

/**
 * Service Provider for `ctx.autotier`. Registration rides the owning fiber: the
 * plugin unloading removes the service with every listener it owns.
 */
export class AutotierService extends Service {
  private readonly scope: SettingsScope<Config>
  private resolved: ResolvedConfig
  private override: RoutingMode | undefined

  /**
   * Register the service as `ctx.autotier` and start following the settings
   * namespace.
   * @param ctx - the owning plugin context.
   * @param options - the live settings scope and the mount-time configuration.
   */
  constructor(ctx: Context, options: AutotierServiceOptions) {
    super(ctx, 'autotier')
    this.scope = options.scope
    this.resolved = options.config
    this.override = undefined
    ctx.effect(() => this.scope.watch((next) => {
      // A committed settings write replaces the whole resolved policy. A value
      // the schema accepted but the cross-field judge rejects keeps the last
      // good policy: settings.register's validate hook already refused the
      // write, so reaching here with an invalid value is impossible.
      this.resolved = resolveConfig(next)
    }))
  }

  /** The live resolved configuration. */
  config(): ResolvedConfig {
    return this.resolved
  }

  /** Set (or clear) the session-independent routing override. */
  setOverride(mode: RoutingMode | undefined): void {
    this.override = mode
  }

  /** The active override, when one is set. */
  currentOverride(): RoutingMode | undefined {
    return this.override
  }

  /** Read-only status snapshot. */
  status(): AutotierStatus {
    const config = this.resolved
    return {
      mode: this.override ?? config.routingMode,
      tiers: {
        strong: routeOf(config.tiers.strong),
        cheap: routeOf(config.tiers.cheap),
        vision: { provider: config.tiers.vision.provider, model: config.tiers.vision.model },
      },
      guard: { enabled: config.guard.enabled, tiers: config.guard.tiers },
      escalation: {
        threshold: config.escalation.threshold,
        windowMs: config.escalation.windowMs,
        ttlMs: config.escalation.ttlMs,
        fallbackTtlMs: config.escalation.fallbackTtlMs,
        signature: config.escalation.signature,
      },
      override: this.override,
    }
  }
}
