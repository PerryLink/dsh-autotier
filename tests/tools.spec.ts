/**
 * Tool three-interface suite: for both registered tools, the parameter schema
 * accepts what it should and rejects what it should not, the canonical value
 * matches the declared output schema, and the rendered content blocks are the
 * model-facing text. Runs over the REAL ToolRuntime so the registry's own
 * validation and materialization are exercised.
 * @module dsh-autotier/tests/tools.spec
 */

import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SettingsProvider from '@deepseek-ai/dsh-settings'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'

/** Minimal in-memory settings provider. */
class ToolSettings extends SettingsProvider {
  readonly writable = true
  private readonly doc: Record<string, unknown> = {}
  protected async load(): Promise<Record<string, unknown>> {
    return this.doc
  }
  protected async persist(ns: string, section: Record<string, unknown>): Promise<void> {
    this.doc[ns] = section
  }
}

/** Mount the plugin over the real tool runtime and create one agent. */
async function mount() {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(ToolSettings)
  ctx.provide('llm', {} as never)
  const fiber = await ctx.plugin(plugin as unknown as import('@deepseek-ai/cordis').Plugin, {})
  const session = ctx.sessions.create(SessionId(`tools-${String(Math.random()).slice(2, 8)}`))
  const agent = { session, ctx } as unknown as Agent
  return {
    ctx,
    agent,
    fiber,
    run: (name: string, args: unknown) => ctx.tools.execute({
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

describe('tier_status tool', () => {
  it('registers both tools on the plugin fiber', async () => {
    const harness = await mount()
    try {
      const names = harness.ctx.tools.schemas(harness.agent).map(schema => schema.name)
      expect(names).toContain('tier_status')
      expect(names).toContain('tier_route')
    } finally {
      await harness.dispose()
    }
  })

  it('returns the canonical status value and renders it as text', async () => {
    const harness = await mount()
    try {
      const result = await harness.run('tier_status', {})
      expect(result.isError).toBe(false)
      const value = result.value as Record<string, unknown>
      expect(value.mode).toBe('auto')
      expect(value.strong).toBe('deepseek-official/deepseek-v4-pro@high')
      expect(value.cheap).toBe('deepseek-official/deepseek-v4-flash')
      expect(value.vision).toBe('deepseek-official/deepseek-v4-flash-vision-exp')
      expect(value.guardEnabled).toBe(true)
      expect(value.appliedTier).toBe('')
      expect(value.escalated).toBe(false)
      expect(value.planActive).toBe(false)
      expect(value.guardDenials).toBe(0)
      const text = result.content[0]
      expect(text?.type).toBe('text')
      expect(text?.type === 'text' ? text.text : '').toContain('"mode": "auto"')
    } finally {
      await harness.dispose()
    }
  })

  it('rejects a wrong-typed argument through the registry schema', async () => {
    const harness = await mount()
    try {
      const result = await harness.run('tier_route', { text: 42 })
      expect(result.isError).toBe(true)
    } finally {
      await harness.dispose()
    }
  })
})

describe('tier_route tool', () => {
  it('dry-runs the classifier and returns the declared shape', async () => {
    const harness = await mount()
    try {
      const result = await harness.run('tier_route', { text: 'Plan the migration of the storage layer end to end' })
      expect(result.isError).toBe(false)
      const value = result.value as Record<string, unknown>
      expect(value.tier).toBe('strong')
      expect(value.scenario).toBe('planning')
      expect(typeof value.confidence).toBe('number')
      expect(value.fingerprint).toMatch(/^planning\|[0-3]\|[0-2]$/u)
      const text = result.content[0]
      expect(text?.type).toBe('text')
      expect(text?.type === 'text' ? text.text : '').toContain('"tier": "strong"')
    } finally {
      await harness.dispose()
    }
  })

  it('rejects a missing required argument', async () => {
    const harness = await mount()
    try {
      const result = await harness.run('tier_route', {})
      expect(result.isError).toBe(true)
      expect(JSON.stringify(result.content)).toContain('text')
    } finally {
      await harness.dispose()
    }
  })

  it('removes both tools with the plugin fiber', async () => {
    const harness = await mount()
    try {
      await harness.fiber.dispose()
      const names = harness.ctx.tools.schemas(harness.agent).map(schema => schema.name)
      expect(names).not.toContain('tier_status')
      expect(names).not.toContain('tier_route')
      expect(harness.ctx.commands.list(harness.agent).find(entry => entry.name === 'tier')).toBeUndefined()
    } finally {
      await harness.dispose()
    }
  })
})
