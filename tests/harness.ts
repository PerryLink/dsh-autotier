/**
 * Shared test harness: a REAL cordis `Context` composed from the published
 * `0.1.2-rc.1` host packages — the session store, the tool runtime, the command
 * runtime, and an in-memory settings provider — plus this plugin. No hand-written
 * service stand-ins are used for the capabilities the plugin injects; the only
 * fake is the settings provider's storage (the abstract `load`/`persist` pair),
 * which is exactly the seam the host expects a provider to implement.
 * @module dsh-autotier/tests/harness
 */

import { Context } from '@deepseek-ai/cordis'
import type { Fiber } from '@deepseek-ai/cordis'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import SessionStore from '@deepseek-ai/dsh-session'
import type { SettingsNamespace, SettingsScope } from '@deepseek-ai/dsh-settings'
import SettingsProvider from '@deepseek-ai/dsh-settings'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import type z from '@deepseek-ai/schemastery'
import * as autotier from '../src/index.ts'
import type { AutotierConfig } from '../src/index.ts'

/**
 * In-memory settings provider. It records every registered namespace scope so a
 * test can drive the user layer of the plugin's own `autotier` namespace.
 */
export class MemorySettings extends SettingsProvider {
  readonly writable = true
  /** Every namespace scope registered, keyed by namespace. */
  readonly scopes = new Map<string, SettingsScope<unknown>>()
  private readonly doc: Record<string, unknown> = {}
  protected async load(): Promise<Record<string, unknown>> {
    return this.doc
  }
  protected async persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.doc[ns] = section
  }
  // The alpha.2 register signature is generically constrained on a non-exported
  // namespace input; the recorder widens the parameter on purpose.
  override register<T>(ns: any, schema: z<T>, options?: Parameters<SettingsProvider['register']>[2]): SettingsScope<T> {
    const scope = super.register(ns, schema, options)
    this.scopes.set(String(ns), scope as unknown as SettingsScope<unknown>)
    return scope
  }
  /** The scope registered for one namespace. */
  scope<T>(ns: string): SettingsScope<T> | undefined {
    return this.scopes.get(ns) as SettingsScope<T> | undefined
  }
}

/** One composed test application. */
export interface AutotierHarness {
  ctx: Context
  /** The plugin's own fiber; disposing it simulates a config hot-reload. */
  pluginFiber: Fiber
  settings: MemorySettings
  dispose(): Promise<void>
}

/**
 * Compose the real host seam plus this plugin over a fresh context.
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
  const pluginFiber = await ctx.plugin(autotier as unknown as import('@deepseek-ai/cordis').Plugin, config)
  return {
    ctx,
    pluginFiber,
    settings,
    async dispose(): Promise<void> {
      await ctx.fiber.dispose()
    },
  }
}
