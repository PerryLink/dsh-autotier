/**
 * Shared test harness: a REAL cordis `Context` composed from the published
 * `0.1.7-alpha.1` host packages — the session store, the tool runtime, the
 * command runtime, and a stand-in for the `settings` service — plus this
 * plugin.
 *
 * The `settings` stand-in is the one fake. The host's real service is
 * `SettingsForms`, which binds to `configEditor`, `profileContext` and the
 * Loader's own fiber graph; none of that is what this plugin consumes. The
 * plugin's whole contract with the service is `configure({ auto })` (claim the
 * Plugins-page policy) plus the Loader's `loader/volatile-update` event, so the
 * stand-in reproduces exactly those two and nothing else.
 *
 * @module dsh-autotier/tests/harness
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { Fiber, Plugin } from '@deepseek-ai/cordis'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as autotier from '../src/index.ts'
import type { AutotierConfig, VolatileConfig } from '../src/index.ts'

/** One recorded `configure` call. */
export interface PagePolicyCall {
  readonly auto: boolean | undefined
  readonly owner: unknown
}

/**
 * Stand-in for the `settings` service. It is a real cordis `Service` named
 * `settings`, so `ctx.get('settings')` and fiber-scoped disposal behave exactly
 * as they do against the host.
 */
export class MemorySettings extends Service {
  /** Every page policy this plugin claimed, in order. */
  readonly policies: PagePolicyCall[] = []
  /** How many disposers the plugin registered for its policy claims. */
  disposals = 0

  constructor(ctx: Context) {
    super(ctx, 'settings')
  }

  /**
   * Record one page-policy claim.
   * @param presentation - the requested policy.
   * @param owner - the owning fiber.
   * @returns the disposer the caller must register as an effect.
   */
  configure(presentation: { auto?: boolean }, owner?: unknown): () => void {
    this.policies.push({ auto: presentation.auto, owner })
    return () => { this.disposals += 1 }
  }
}

/** One composed test application. */
export interface AutotierHarness {
  ctx: Context
  /** The plugin's own fiber; disposing it simulates a config hot-reload. */
  pluginFiber: Fiber
  settings: MemorySettings
  /**
   * The row's parsed volatile references. A test drives a hot edit by copying a
   * new snapshot into one of these with `updateVolatile` and then emitting
   * `loader/volatile-update`, exactly as the Loader commits a form write.
   */
  liveConfig: VolatileConfig
  dispose(): Promise<void>
}

/**
 * Compose the real host seam plus this plugin over a fresh context.
 *
 * The row config is handed over as PLAIN data. cordis validates it through the
 * plugin's own exported `Config` schema as the fiber starts — the same step the
 * Loader performs — and that is what produces the live `Volatile` references
 * exposed as {@link AutotierHarness.liveConfig}. Parsing here instead would
 * double-validate an already-parsed row, which Schemastery rejects (its volatile
 * branch re-wraps its input rather than adopting an existing reference).
 *
 * @param config - plugin configuration; omitted fields take schema defaults.
 * @returns the live harness.
 */
export async function createHarness(config: AutotierConfig = {}): Promise<AutotierHarness> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(MemorySettings)
  const settings = ctx.get('settings') as MemorySettings
  // `llm` is injected as a hard dependency; the routing suite replaces this
  // stand-in with a real LlmService plus a mock adapter when it needs requests.
  ctx.provide('llm', {} as never)
  const pluginFiber = await ctx.plugin(autotier as unknown as Plugin, config)
  return {
    ctx,
    pluginFiber,
    settings,
    liveConfig: pluginFiber.config as VolatileConfig,
    async dispose(): Promise<void> {
      await ctx.fiber.dispose()
    },
  }
}
