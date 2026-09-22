/**
 * The host settings seam for dsh-autotier.
 *
 * The `0.1.7` host owns forms, not providers: `ctx.settings` is a
 * `SettingsForms` service that projects each plugin's `Config` schema into a
 * Plugins-page form, and a live edit is committed through the Loader's
 * `loader/volatile-update` event. The pre-`0.1.6` `settings.register(ns, schema,
 * { base })` call this plugin used to make — and the `settings/updated` event it
 * listened to — no longer exist on any published line that ships the new
 * service, so the configuration is read from the row's own `Volatile` fields.
 *
 * Two duties live here:
 *
 * 1. Claim this instance's page policy (`configure({ auto: false })`) so the
 *    plugin appears in the Plugins page rather than only in a generated form.
 * 2. Re-resolve the routing policy whenever a live edit lands, by re-reading
 *    the `Volatile` references and running them through the same cross-field
 *    judge the mount path uses.
 *
 * @module dsh-autotier/settings
 */

import type { Context } from '@deepseek-ai/cordis'
// Registers `loader/volatile-update` on cordis's Events map. The event is
// declared by the LOADER package, not by cordis core, so this import is what
// makes `ctx.on('loader/volatile-update', ...)` type-check — a type-only import
// has no runtime effect and never bundles.
import type {} from '@deepseek-ai/cordis-plugin-loader'
import { resolveConfig, type ResolvedConfig, type VolatileConfig } from './config.ts'
import type { AutotierService } from './service.ts'

/** The `ctx.settings` face this module uses (structural: the service moved packages). */
interface SettingsFormsFace {
  configure(presentation: { auto?: boolean }, owner?: unknown): () => void
}

/** Options for {@link bindSettings}. */
export interface BindSettingsOptions {
  readonly ctx: Context
  /** The row configuration the Loader handed `apply`; every section is volatile. */
  readonly config: VolatileConfig
  /** The live service whose policy is swapped on each committed edit. */
  readonly service: AutotierService
}

/**
 * Claim the settings page policy and follow live configuration edits.
 *
 * The page-policy claim is best-effort: `settings` is a hard inject, but a host
 * line that composes the plugin without the settings service must still route,
 * so a missing or differently-shaped service degrades to "no page" instead of
 * failing the mount.
 *
 * @param options - the plugin context, the volatile row config and the service.
 */
export function bindSettings(options: BindSettingsOptions): void {
  const { ctx, config, service } = options
  const settings = ctx.get('settings') as SettingsFormsFace | undefined
  if (settings !== undefined && typeof settings.configure === 'function') {
    ctx.effect(() => settings.configure({ auto: false }, ctx.fiber))
  }
  ctx.on('loader/volatile-update', () => {
    // A committed edit replaces the whole snapshot. The write was accepted by
    // the Loader against the schema, which cannot express this plugin's
    // cross-field rules, so the judge runs here; a value it refuses keeps the
    // last good policy rather than swapping in something unroutable.
    let next: ResolvedConfig
    try {
      next = resolveConfig(config)
    } catch (error) {
      ctx.logger.warn(
        'dsh-autotier: keeping the last good routing policy; the updated configuration was refused: %s',
        error instanceof Error ? error.message : String(error),
      )
      return
    }
    service.reconfigure(next)
    ctx.logger.info('dsh-autotier: routing policy reloaded from a live configuration update')
  })
}
