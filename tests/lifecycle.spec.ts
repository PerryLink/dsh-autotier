/**
 * Fiber-disposal / HMR-safety + export-contract suite: mounting the plugin over
 * the REAL session, tools and commands services plus the settings stand-in,
 * disposing its contributing fiber, and re-querying the authoritative
 * registries to prove the `autotier` service and every effect it owns disappear;
 * plus the function-plugin namespace contract (no default export, Loader unwrap
 * round-trip) and the live settings-update path.
 * @module dsh-autotier/tests/lifecycle.spec
 */

import Loader from '@deepseek-ai/cordis-plugin-loader'
import { createVolatile, updateVolatile } from '@deepseek-ai/cosmokit'
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
  it('publishes the autotier service and claims the settings page policy', async () => {
    const harness = await createHarness()
    try {
      const service = harness.ctx.get('autotier')
      expect(service).toBeDefined()
      const status = service!.status()
      expect(status.mode).toBe('auto')
      expect(status.tiers.strong).toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high' })
      // The cheap tier follows the session effort, so its route carries no effort.
      expect(status.tiers.cheap).toEqual({ provider: 'deepseek-official', model: 'deepseek-flash' })
      expect(status.tiers.vision.model).toBe('deepseek-flash')
      expect(status.guard).toEqual({ enabled: true, tiers: ['cheap'] })
      // `settings` is a hard inject, and the plugin must claim `auto: false` so
      // the Plugins page renders its own card instead of a generated form.
      expect(harness.settings.policies).toEqual([{ auto: false, owner: harness.pluginFiber }])
    } finally {
      await harness.dispose()
    }
  })

  it('applies the row config as the composition layer', async () => {
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

  it('follows a live configuration update through loader/volatile-update', async () => {
    // The host commits a form edit by validating the new Config, copying each
    // volatile snapshot into the row's existing reference, and emitting
    // `loader/volatile-update`. `updateVolatile` is that copy; the harness has
    // already parsed the row through the real schema, so the reference exists.
    const harness = await createHarness()
    try {
      expect(harness.ctx.get('autotier')!.status().tiers.strong.effort).toBe('high')
      const live = harness.liveConfig
      updateVolatile(live.tiers, createVolatile({ strong: { effort: 'max' } }))
      harness.ctx.emit('loader/volatile-update', [])
      expect(harness.ctx.get('autotier')!.status().tiers.strong.effort).toBe('max')
    } finally {
      await harness.dispose()
    }
  })

  it('keeps the last good policy when a live update is cross-field-invalid', async () => {
    const harness = await createHarness()
    try {
      const service = harness.ctx.get('autotier')!
      expect(service.status().escalation.threshold).toBe(2)
      // A strong/cheap collision: the schema accepts each value in isolation,
      // the cross-field judge does not.
      updateVolatile(harness.liveConfig.tiers, createVolatile({
        cheap: { provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high', followSession: false },
      }))
      harness.ctx.emit('loader/volatile-update', [])
      // The refused update leaves the last good policy routing.
      expect(service.status().tiers.cheap.model).toBe('deepseek-flash')
      expect(service.status().escalation.threshold).toBe(2)
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
      // cordis 4.0.3 words the duplicate-service refusal as `has been registered`.
      await expect(harness.ctx.plugin(plugin as unknown as import('@deepseek-ai/cordis').Plugin, {}))
        .rejects.toThrow(/has been registered/u)
    } finally {
      await harness.dispose()
    }
  })
})
