/**
 * The `tier` Typert Remote host suite: mounted over the REAL session, tools,
 * commands and settings services, the service serves the status/catalog
 * payloads, refuses an unusable write, and — the point of the whole browser
 * face — writes the very per-agent `RouteState.override` the router and the
 * `/tier` surfaces read. The proof is the `tier_status` tool, which reads that
 * same store through the agent it is given.
 *
 * @module dsh-autotier/tests/tier-remote.spec
 */

import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'
import type { TierRemoteService } from '../src/tier-remote.ts'
import { TIER_STATUS_SCHEMA } from '../src/wire.ts'
import { MemorySettings } from './harness.ts'

/** The session id the fake agent registry answers to. */
const SESSION_ID = 'tier-remote-session'

/** The two registered models the fake `llm` face advertises. */
const PROVIDERS = [{ id: 'deepseek-official' }]
const MODELS: Record<string, { id: string; name: string; inputModalities: string[] }[]> = {
  'deepseek-official': [
    { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', inputModalities: ['text'] },
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', inputModalities: ['text', 'image'] },
  ],
}

/** Mount the plugin over the real host seam plus a fake agent registry and llm catalog. */
async function mount(llm?: { listProviders: () => { id: string }[]; listModels: (provider: string) => Promise<{ id: string; name: string; inputModalities: string[] }[]> }) {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(MemorySettings)
  ctx.provide('llm', (llm ?? {
    listProviders: () => PROVIDERS,
    listModels: async (provider: string) => MODELS[provider] ?? [],
  }) as never)
  // One stable agent object: the per-agent state store is a WeakMap keyed by
  // identity, so every surface must be handed this exact object.
  const session = ctx.sessions.create(SessionId(SESSION_ID))
  const agent = { id: SESSION_ID, session } as unknown as Agent
  ctx.provide('agents', {
    get: (id: unknown) => (id === SESSION_ID ? agent : undefined),
  } as never)
  await ctx.plugin(plugin as unknown as import('@deepseek-ai/cordis').Plugin, {})
  const tier = ctx.get('tier') as TierRemoteService
  return {
    ctx,
    agent,
    tier,
    runTool: (name: string, args: unknown) => ctx.tools.execute({
      callId: `call-${String(Math.random()).slice(2, 8)}` as never,
      name,
      arguments: args,
      agent,
      signal: new AbortController().signal,
    }),
    async dispose() {
      await ctx.fiber.dispose()
    },
  }
}

describe('tier service mount', () => {
  it('publishes the tier service on the plugin fiber', async () => {
    const harness = await mount()
    try {
      expect(harness.ctx.get('tier')).toBeDefined()
      expect(typeof harness.tier.status).toBe('function')
      expect(typeof harness.tier.catalog).toBe('function')
      expect(typeof harness.tier.setMode).toBe('function')
    } finally {
      await harness.dispose()
    }
  })

  it('removes the tier service with the plugin fiber', async () => {
    const harness = await mount()
    try {
      expect(harness.ctx.get('tier')).toBeDefined()
      await harness.ctx.fiber.dispose()
      expect(harness.ctx.get('tier')).toBeUndefined()
    } finally {
      await harness.dispose()
    }
  })
})

describe('tier/status', () => {
  it('answers the composition mode with an empty session view when no id is given', async () => {
    const harness = await mount()
    try {
      const status = harness.tier.status()
      expect(status.mode).toBe('auto')
      expect(status.session).toEqual({
        agentId: null,
        override: null,
        mode: 'auto',
        appliedTier: null,
        appliedSource: null,
        escalation: false,
        plan: false,
        denials: 0,
      })
      expect(status.tiers.strong.effort).toBe('high')
      expect(status.guard).toEqual({ enabled: true, tiers: ['cheap'] })
    } finally {
      await harness.dispose()
    }
  })

  it('resolves a known session and degrades an unknown one to the empty view', async () => {
    const harness = await mount()
    try {
      const known = harness.tier.status(SESSION_ID)
      expect(known.session.agentId).toBe(SESSION_ID)
      expect(known.session.mode).toBe('auto')
      const unknown = harness.tier.status('not-a-session')
      expect(unknown.session.agentId).toBe('not-a-session')
      expect(unknown.session.override).toBeNull()
      expect(unknown.session.mode).toBe('auto')
    } finally {
      await harness.dispose()
    }
  })

  it('serializes through the shared strict codec', async () => {
    const harness = await mount()
    try {
      expect(() => TIER_STATUS_SCHEMA.parse(JSON.parse(JSON.stringify(harness.tier.status(SESSION_ID))))).not.toThrow()
    } finally {
      await harness.dispose()
    }
  })
})

describe('tier/catalog', () => {
  it('serves the live registered providers and models', async () => {
    const harness = await mount()
    try {
      const catalog = await harness.tier.catalog()
      expect(catalog).toEqual([{
        provider: 'deepseek-official',
        models: [
          { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', inputModalities: ['text'] },
          { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', inputModalities: ['text', 'image'] },
        ],
      }])
    } finally {
      await harness.dispose()
    }
  })

  it('degrades a provider whose model listing throws instead of failing the call', async () => {
    const harness = await mount({
      listProviders: () => [{ id: 'deepseek-official' }, { id: 'broken' }],
      listModels: async (provider: string) => {
        if (provider === 'broken') throw new Error('adapter offline')
        return MODELS[provider] ?? []
      },
    })
    try {
      const catalog = await harness.tier.catalog()
      expect(catalog.map(entry => entry.provider)).toEqual(['deepseek-official', 'broken'])
      expect(catalog[1]?.models).toEqual([])
    } finally {
      await harness.dispose()
    }
  })
})

describe('tier/setMode', () => {
  it('pins the session override without touching the composition mode', async () => {
    const harness = await mount()
    try {
      const pinned = harness.tier.setMode('strong', SESSION_ID)
      expect(pinned.session.override).toBe('strong')
      expect(pinned.session.mode).toBe('strong')
      // The base mode is the composition mode and must not follow the session.
      expect(pinned.mode).toBe('auto')
      expect(harness.tier.status().mode).toBe('auto')
    } finally {
      await harness.dispose()
    }
  })

  it('writes the same state the routing surfaces read', async () => {
    const harness = await mount()
    try {
      harness.tier.setMode('cheap', SESSION_ID)
      const result = await harness.runTool('tier_status', {})
      expect(result.isError).toBe(false)
      const value = result.value as { mode: string }
      expect(value.mode).toBe('cheap')
    } finally {
      await harness.dispose()
    }
  })

  it('clears the override with auto', async () => {
    const harness = await mount()
    try {
      harness.tier.setMode('off', SESSION_ID)
      const cleared = harness.tier.setMode('auto', SESSION_ID)
      expect(cleared.session.override).toBeNull()
      expect(cleared.session.mode).toBe('auto')
      const result = await harness.runTool('tier_status', {})
      expect((result.value as { mode: string }).mode).toBe('auto')
    } finally {
      await harness.dispose()
    }
  })

  it('accepts every routing mode', async () => {
    const harness = await mount()
    try {
      for (const mode of ['auto', 'strong', 'cheap', 'delegated', 'off'] as const) {
        const status = harness.tier.setMode(mode, SESSION_ID)
        expect(status.session.mode).toBe(mode)
        expect(status.session.override).toBe(mode === 'auto' ? null : mode)
      }
    } finally {
      await harness.dispose()
    }
  })

  it('refuses a missing agent id, an unknown agent and an unknown mode', async () => {
    const harness = await mount()
    try {
      expect(() => harness.tier.setMode('strong')).toThrow(/session id/u)
      expect(() => harness.tier.setMode('strong', '')).toThrow(/session id/u)
      expect(() => harness.tier.setMode('strong', 'ghost')).toThrow(/no live agent/u)
      expect(() => harness.tier.setMode('turbo' as never, SESSION_ID)).toThrow(TypeError)
      // A refused write leaves the last good override in place.
      harness.tier.setMode('cheap', SESSION_ID)
      expect(() => harness.tier.setMode('turbo' as never, SESSION_ID)).toThrow(TypeError)
      expect(harness.tier.status(SESSION_ID).session.override).toBe('cheap')
    } finally {
      await harness.dispose()
    }
  })

  it('agrees with the /tier command surface', async () => {
    const harness = await mount()
    try {
      harness.tier.setMode('strong', SESSION_ID)
      const execution = await harness.ctx.commands.execute(harness.agent, '/tier status', [], new AbortController().signal)
      expect(execution?.result.kind).toBe('success')
      expect(execution?.result.kind === 'success' ? execution.result.text : '').toContain('mode: strong')
    } finally {
      await harness.dispose()
    }
  })
})
