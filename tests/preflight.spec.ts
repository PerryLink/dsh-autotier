/**
 * Route pre-flight suite: a landing whose provider is unregistered falls back
 * to a registered chain entry, an effort the target model rejects is dropped,
 * an adapter that cannot answer is treated leniently, and both answers are
 * cached per provider/model.
 * @module dsh-autotier/tests/preflight.spec
 */

import { Context } from '@deepseek-ai/cordis'
import {
  LlmAdapter,
  LlmRuntime,
  ReasoningEffortId,
  type LlmResolvedModelInfo,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { resolveConfig, type ResolvedTierConfig } from '../src/config.ts'
import { assertTierDefaultsInCatalog, RoutePreflight } from '../src/preflight.ts'
import type { TierRoute } from '../src/types.ts'

/** An adapter that declares a fixed effort vocabulary per model. */
class DeclaringAdapter extends LlmAdapter {
  readonly lookups: string[] = []
  constructor(private readonly efforts: Record<string, string[] | 'error'>) {
    super()
  }
  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    this.lookups.push(model)
    const declared = this.efforts[model]
    if (declared === 'error') return Promise.reject(new Error('adapter lookup failed'))
    if (declared === undefined) return Promise.resolve({ provider, id: model, name: model })
    return Promise.resolve({
      provider,
      id: model,
      name: model,
      reasoning: {
        efforts: declared.map(id => ({ id: ReasoningEffortId(id), name: id })),
        defaultEffort: ReasoningEffortId(declared[0]!),
      },
    })
  }
  override stream(): AsyncIterable<StreamChunk> {
    return (async function* empty(): AsyncGenerator<StreamChunk> {})()
  }
}

/** Mount a real LLM runtime over one mock provider route. */
async function mount(efforts: Record<string, string[] | 'error'> = {}) {
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  const adapter = new DeclaringAdapter(efforts)
  ctx.llm.registerAdapter(['mock'], adapter)
  const notes: string[] = []
  const preflight = new RoutePreflight({ ctx, onDegrade: (key, note) => notes.push(`${key}: ${note}`) })
  return { ctx, adapter, preflight, notes, async dispose() { await ctx.fiber.dispose() } }
}

/** The default cheap tier (followSession, model deepseek-flash). */
const cheap = resolveConfig(undefined).tiers.cheap as ResolvedTierConfig

describe('RoutePreflight', () => {
  it('keeps a registered provider with a declared effort unchanged', async () => {
    const harness = await mount({ 'cheap-model': ['off', 'low', 'high', 'max'] })
    try {
      const route: TierRoute = { provider: 'mock', model: 'cheap-model', effort: 'low' }
      const safe = await harness.preflight.sanitize(route, { ...cheap, provider: 'mock', model: 'cheap-model' })
      expect(safe).toEqual(route)
      expect(harness.notes).toEqual([])
    } finally {
      await harness.dispose()
    }
  })

  it('drops an effort the target model does not declare', async () => {
    const harness = await mount({ 'cheap-model': ['high', 'max'] })
    try {
      const safe = await harness.preflight.sanitize(
        { provider: 'mock', model: 'cheap-model', effort: 'low' },
        { ...cheap, provider: 'mock', model: 'cheap-model' },
      )
      expect(safe.effort).toBeUndefined()
      expect(safe.model).toBe('cheap-model')
      expect(harness.notes).toHaveLength(1)
      expect(harness.notes[0]).toContain('does not accept reasoning effort "low"')
    } finally {
      await harness.dispose()
    }
  })

  it('keeps the effort when the adapter cannot answer (lenient)', async () => {
    const harness = await mount({ 'cheap-model': 'error' })
    try {
      const route: TierRoute = { provider: 'mock', model: 'cheap-model', effort: 'low' }
      const safe = await harness.preflight.sanitize(route, { ...cheap, provider: 'mock', model: 'cheap-model' })
      expect(safe).toEqual(route)
      expect(harness.notes).toEqual([])
    } finally {
      await harness.dispose()
    }
  })

  it('redirects an unregistered provider to a registered fallback entry', async () => {
    const harness = await mount()
    try {
      const tier: ResolvedTierConfig = {
        ...cheap,
        provider: 'ghost',
        model: 'ghost-model',
        effort: 'low',
        followSession: false,
        fallback: [{ provider: 'mock', model: 'backup-model' }],
      }
      const safe = await harness.preflight.sanitize({ provider: 'ghost', model: 'ghost-model', effort: 'low' }, tier)
      expect(safe).toEqual({ provider: 'mock', model: 'backup-model', effort: 'low' })
      expect(harness.notes[0]).toContain('is not registered')
    } finally {
      await harness.dispose()
    }
  })

  it('leaves an unregistered provider with no usable fallback alone and reports once', async () => {
    const harness = await mount()
    try {
      const tier: ResolvedTierConfig = { ...cheap, provider: 'ghost', model: 'ghost-model', fallback: [] }
      const route: TierRoute = { provider: 'ghost', model: 'ghost-model' }
      expect(await harness.preflight.sanitize(route, tier)).toEqual(route)
      await harness.preflight.sanitize(route, tier)
      expect(harness.notes).toHaveLength(1)
    } finally {
      await harness.dispose()
    }
  })

  it('caches the capability lookup per provider/model', async () => {
    const harness = await mount({ 'cheap-model': ['low'] })
    try {
      const tier: ResolvedTierConfig = { ...cheap, provider: 'mock', model: 'cheap-model' }
      const route: TierRoute = { provider: 'mock', model: 'cheap-model', effort: 'low' }
      await harness.preflight.sanitize(route, tier)
      await harness.preflight.sanitize(route, tier)
      await harness.preflight.sanitize(route, tier)
      expect(harness.adapter.lookups).toEqual(['cheap-model'])
    } finally {
      await harness.dispose()
    }
  })
})

/** Mount a real LLM runtime with the `deepseek-official` provider route. */
async function mountCatalog(efforts: Record<string, string[] | 'error'> = {}) {
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  const adapter = new DeclaringAdapter(efforts)
  ctx.llm.registerAdapter(['deepseek-official'], adapter)
  return { ctx, adapter, async dispose() { await ctx.fiber.dispose() } }
}

describe('assertTierDefaultsInCatalog', () => {
  it('passes when every default tier id resolves in the new-generation catalogue', async () => {
    const harness = await mountCatalog({ 'deepseek-flash': [], 'deepseek-v4-pro': [] })
    try {
      await expect(assertTierDefaultsInCatalog(harness.ctx, resolveConfig(undefined).tiers)).resolves.toBeUndefined()
    } finally {
      await harness.dispose()
    }
  })

  it('fails loudly when a default id is outside the new-generation catalogue', async () => {
    // deepseek-flash resolves (new-generation marker); the strong default is absent.
    const harness = await mountCatalog({ 'deepseek-v4-pro': 'error' })
    try {
      await expect(assertTierDefaultsInCatalog(harness.ctx, resolveConfig(undefined).tiers)).rejects.toThrow(
        /strong model "deepseek-official\/deepseek-v4-pro" is not in the host catalogue/,
      )
    } finally {
      await harness.dispose()
    }
  })

  it('skips on an old-generation catalogue that resolves none of the default ids', async () => {
    const harness = await mountCatalog({ 'deepseek-flash': 'error', 'deepseek-v4-pro': 'error' })
    try {
      await expect(assertTierDefaultsInCatalog(harness.ctx, resolveConfig(undefined).tiers)).resolves.toBeUndefined()
    } finally {
      await harness.dispose()
    }
  })

  it('skips when the deepseek-official provider is not registered', async () => {
    const harness = await mount()
    try {
      await expect(assertTierDefaultsInCatalog(harness.ctx, resolveConfig(undefined).tiers)).resolves.toBeUndefined()
    } finally {
      await harness.dispose()
    }
  })
})
