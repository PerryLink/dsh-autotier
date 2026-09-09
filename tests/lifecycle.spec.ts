/**
 * Fiber-disposal / HMR-safety + export-contract suite: mounting the plugin over
 * the REAL session, tools, commands and settings services, disposing its
 * contributing fiber, and re-querying the authoritative registries to prove the
 * `autotier` service and settings namespace disappear; plus the function-plugin
 * namespace contract (no default export, Loader unwrap round-trip) and the
 * save-time settings validation that refuses a cross-field-invalid write.
 * @module dsh-autotier/tests/lifecycle.spec
 */

import Loader from '@deepseek-ai/cordis-plugin-loader'
import { describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'
import { createHarness } from './harness.ts'

describe('function-plugin contract', () => {
  it('carries no default export and the Loader unwrap round-trips the namespace', () => {
    expect('default' in plugin).toBe(false)
    expect(plugin.name).toBe('dsh-autotier')
    expect(plugin.inject).toEqual(['settings', 'llm', 'tools', 'commands', 'sessions'])
    expect(typeof plugin.apply).toBe('function')
    expect(plugin.Config).toBeDefined()
    const loader = Object.create(Loader.prototype)
    const unwrapped = loader.unwrapExports(plugin)
    expect(unwrapped).toBe(plugin)
    expect(unwrapped.name).toBe('dsh-autotier')
  })

  it('declares the plural `sessions` service, never the singular form', () => {
    expect(plugin.inject).toContain('sessions')
    expect(plugin.inject).not.toContain('session')
  })
})

describe('mount over the real host seam', () => {
  it('publishes the autotier service and the settings namespace', async () => {
    const harness = await createHarness()
    try {
      const service = harness.ctx.get('autotier')
      expect(service).toBeDefined()
      const status = service!.status()
      expect(status.mode).toBe('auto')
      expect(status.tiers.strong).toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high' })
      // The cheap tier follows the session effort, so its route carries no effort.
      expect(status.tiers.cheap).toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-flash' })
      expect(status.tiers.vision.model).toBe('deepseek-v4-flash-vision-exp')
      expect(status.guard).toEqual({ enabled: true, tiers: ['cheap'] })
      expect(harness.settings.scope('autotier')).toBeDefined()
    } finally {
      await harness.dispose()
    }
  })

  it('applies the row config as the settings base layer', async () => {
    const harness = await createHarness({ routingMode: 'cheap', tiers: { strong: { effort: 'max' } } })
    try {
      const service = harness.ctx.get('autotier')
      expect(service).toBeDefined()
      expect(service!.status().mode).toBe('cheap')
      expect(service!.status().tiers.strong.effort).toBe('max')
    } finally {
      await harness.dispose()
    }
  })

  it('follows a committed settings write live', async () => {
    const harness = await createHarness()
    try {
      const scope = harness.settings.scope<{ routingMode?: string }>('autotier')
      expect(scope).toBeDefined()
      await scope!.update({ routingMode: 'strong' })
      const service = harness.ctx.get('autotier')
      expect(service).toBeDefined()
      expect(service!.status().mode).toBe('strong')
    } finally {
      await harness.dispose()
    }
  })

  it('refuses a cross-field-invalid settings write at save time', async () => {
    const harness = await createHarness()
    try {
      const scope = harness.settings.scope<Record<string, unknown>>('autotier')
      await expect(scope!.update({ escalation: { threshold: 0 } })).rejects.toThrow(/escalation\.threshold/u)
      // The refused write leaves the last good policy in place.
      const service = harness.ctx.get('autotier')
      expect(service).toBeDefined()
      expect(service!.status().escalation.threshold).toBe(2)
    } finally {
      await harness.dispose()
    }
  })
})

describe('fiber disposal', () => {
  it('removes the autotier service and releases the settings namespace when the fiber is disposed', async () => {
    const harness = await createHarness()
    try {
      expect(harness.ctx.get('autotier')).toBeDefined()

      await harness.pluginFiber.dispose()
      expect(harness.ctx.get('autotier')).toBeUndefined()

      // The namespace registration rode the same fiber: a fresh mount must be
      // able to claim `autotier` again (a leaked registration would fail loud).
      const remount = await harness.ctx.plugin(plugin as unknown as import('@deepseek-ai/cordis').Plugin, {})
      expect(harness.ctx.get('autotier')).toBeDefined()
      await remount.dispose()
      expect(harness.ctx.get('autotier')).toBeUndefined()
    } finally {
      await harness.dispose()
    }
  })

  it('rejects a same-namespace remount while the first fiber is live', async () => {
    const harness = await createHarness()
    try {
      await expect(harness.ctx.plugin(plugin as unknown as import('@deepseek-ai/cordis').Plugin, {}))
        .rejects.toThrow(/already registered/u)
    } finally {
      await harness.dispose()
    }
  })
})
