/**
 * Request-time route pre-flight: before a tier landing is written into the
 * request configuration, check the two facts that would make the request fail
 * outright — is the provider route registered, and does the target model accept
 * the configured reasoning effort?
 *
 * Both answers come from the live `ctx.llm` registry and are cached per
 * `provider/model`, so the common case costs one Map lookup. A route that fails
 * pre-flight degrades instead of failing the turn: an unregistered provider
 * falls back to a registered chain entry, and an unsupported effort is omitted
 * (the adapter default then applies). Each degradation is logged once per key.
 *
 * @module dsh-autotier/preflight
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ResolvedConfig, ResolvedTierConfig } from './config.ts'
import type { TierRoute } from './types.ts'

/** One cached model capability answer. */
type Capability = { readonly registered: boolean; readonly efforts: ReadonlySet<string> | undefined }

/** Options for {@link RoutePreflight}. */
export interface RoutePreflightOptions {
  readonly ctx: Context
  /** Called once per degraded route key; the caller owns the log level. */
  readonly onDegrade: (key: string, note: string) => void
}

/**
 * Pre-flight cache and checker for one plugin instance. The cache is per
 * process and never invalidated: adapter registrations are composition-level
 * facts, and a reload rebuilds the plugin (and this cache) with them.
 */
export class RoutePreflight {
  private readonly ctx: Context
  private readonly onDegrade: (key: string, note: string) => void
  private readonly capabilities = new Map<string, Promise<Capability>>()
  private readonly degraded = new Set<string>()

  /** @param options - the plugin context and the degrade reporter. */
  constructor(options: RoutePreflightOptions) {
    this.ctx = options.ctx
    this.onDegrade = options.onDegrade
  }

  /** One cached capability lookup; a failing adapter is treated as lenient. */
  private capability(provider: string, model: string): Promise<Capability> {
    const key = `${provider}/${model}`
    let pending = this.capabilities.get(key)
    if (pending === undefined) {
      const providers = this.ctx.llm.listProviders()
      const registered = providers.some(entry => entry.id === provider)
      pending = registered
        ? this.ctx.llm.resolveModelInfo(provider, model).then(
          info => ({ registered: true, efforts: info.reasoning === undefined ? undefined : new Set(info.reasoning.efforts.map(effort => String(effort.id))) }),
          () => ({ registered: true, efforts: undefined }),
        )
        : Promise.resolve({ registered: false, efforts: undefined })
      this.capabilities.set(key, pending)
    }
    return pending
  }

  /** Report one degradation at most once per key. */
  private degrade(key: string, note: string): void {
    if (this.degraded.has(key)) return
    this.degraded.add(key)
    this.onDegrade(key, note)
  }

  /**
   * Make one tier landing safe to apply.
   * @param route - the landing the policy produced.
   * @param tier - the tier configuration, for its fallback chain.
   * @returns a landing that will not fail the request on provider/effort facts.
   */
  async sanitize(route: TierRoute, tier: ResolvedTierConfig): Promise<TierRoute> {
    const capability = await this.capability(route.provider, route.model)
    let safe = route
    if (!capability.registered) {
      const entry = tier.fallback.find(candidate => this.ctx.llm.listProviders().some(p => p.id === candidate.provider))
      if (entry !== undefined) {
        this.degrade(
          `provider:${route.provider}`,
          `provider "${route.provider}" is not registered; using fallback "${entry.provider}/${entry.model}"`,
        )
        safe = tier.followSession
          ? { provider: entry.provider, model: entry.model }
          : { provider: entry.provider, model: entry.model, effort: tier.effort }
      } else {
        this.degrade(`provider:${route.provider}`, `provider "${route.provider}" is not registered and the tier has no usable fallback`)
      }
    }
    const effort = safe.effort
    if (effort !== undefined && capability.efforts !== undefined && !capability.efforts.has(effort)) {
      this.degrade(
        `effort:${route.provider}/${route.model}`,
        `model "${route.model}" does not accept reasoning effort "${effort}"; the adapter default applies`,
      )
      safe = { provider: safe.provider, model: safe.model }
    }
    return safe
  }
}

/**
 * Mount-time default-model catalogue membership check.
 *
 * The 0.1.6 line removed the `deepseek-v4-flash*` catalogue ids and introduced
 * `deepseek-flash` (image-capable). On that catalogue generation a default
 * tier id that is not in the host catalogue must fail the mount loudly —
 * silently degrading to a text-only passthrough is exactly the N7 regression
 * this check guards against.
 *
 * Generation gate: hosts whose catalogue predates the new vocabulary (e.g.
 * `0.1.2-rc.1`, where none of the default ids exist) keep the accepted M2
 * degradation (unlisted id ⇒ text-only) and skip the check with one
 * documented log line, so mounting on the old compat rows is preserved.
 *
 * @param ctx - the plugin context.
 * @param tiers - the resolved tier landings to verify.
 * @throws {Error} when the catalogue is the new generation and a default
 *   model id is not present in it.
 */
export async function assertTierDefaultsInCatalog(ctx: Context, tiers: ResolvedConfig['tiers']): Promise<void> {
  const provider = 'deepseek-official'
  const llm = ctx.llm
  // Minimal llm faces (scripted harnesses, pared-down compositions) lack the
  // catalogue seam; they keep the accepted degraded behavior and skip.
  if (llm === undefined || typeof llm.listProviders !== 'function' || typeof llm.resolveModelInfo !== 'function') {
    ctx.logger.info('dsh-autotier: the llm catalogue seam is unavailable; skipping the default-model catalogue check')
    return
  }
  const registered = llm.listProviders().some(entry => entry.id === provider)
  if (!registered) {
    ctx.logger.info('dsh-autotier: provider "%s" is not registered; skipping the default-model catalogue check', provider)
    return
  }
  const defaults = [
    ['strong', tiers.strong.model],
    ['cheap', tiers.cheap.model],
    ['vision', tiers.vision.model],
  ] as const
  // New-generation probe: the catalogue is the 0.1.6 vocabulary when any of
  // the default ids resolves; an old catalogue resolves none of them.
  let newGeneration = false
  for (const [, model] of defaults) {
    try {
      await llm.resolveModelInfo(provider, model)
      newGeneration = true
      break
    } catch {
      // Old catalogue or absent id: keep probing the other defaults.
    }
  }
  if (!newGeneration) {
    ctx.logger.info(
      'dsh-autotier: the host catalogue predates the deepseek-flash vocabulary; skipping the default-model catalogue check (unlisted ids degrade to text-only on this host)',
    )
    return
  }
  for (const [tier, model] of defaults) {
    try {
      await llm.resolveModelInfo(provider, model)
    } catch {
      throw new Error(
        `dsh-autotier: the default ${tier} model "${provider}/${model}" is not in the host catalogue; refusing to mount with a silent text-only landing`,
      )
    }
  }
}
