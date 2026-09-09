/**
 * Selection-sync and coexistence suites: the applied tier is mirrored into the
 * default-model document, an external change to that document delegates every
 * live session, our own write is not mistaken for a user's, and a layer that
 * overwrites the request configuration is reported once.
 * @module dsh-autotier/tests/selection.spec
 */

import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SessionStore from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'
import { SelectionSync } from '../src/selection.ts'
import { AgentStateStore } from '../src/state.ts'

/** A recording stand-in for `ctx.agentDefaultModel`. */
class FakeDefaultModel {
  readonly writes: { provider: string; model: string; reasoningEffort?: string }[] = []
  fail = false
  async saveSelection(next: { provider: string; model: string; reasoningEffort?: string }): Promise<void> {
    if (this.fail) throw new Error('settings write refused')
    this.writes.push(next)
  }
}

/** One live agent registered in a real registry. */
async function mount() {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(AgentRegistry)
  const session = ctx.sessions.create()
  const agent = { id: session.id, session } as unknown as Agent
  const registry = ctx.get('agents')
  registry!.register(agent)
  const defaultModel = new FakeDefaultModel()
  ctx.provide('agentDefaultModel', defaultModel as never)
  const states = new AgentStateStore()
  const sync = new SelectionSync({ ctx, states })
  return { ctx, agent, defaultModel, states, sync, async dispose() { await ctx.fiber.dispose() } }
}

describe('SelectionSync', () => {
  it('mirrors an applied landing into the default-model document once', async () => {
    const harness = await mount()
    try {
      harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-v4-flash', effort: 'low' })
      harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-v4-flash', effort: 'low' })
      await Promise.resolve()
      expect(harness.defaultModel.writes).toEqual([
        { provider: 'deepseek-official', model: 'deepseek-v4-flash', reasoningEffort: 'low' },
      ])
    } finally {
      await harness.dispose()
    }
  })

  it('ignores its own write coming back as a settings event', async () => {
    const harness = await mount()
    try {
      harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high' })
      await Promise.resolve()
      harness.ctx.emit(
        'settings/updated',
        'agent-default-model' as never,
        { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'high' },
        {},
        'update',
      )
      expect(harness.states.for(harness.agent).override).toBeUndefined()
    } finally {
      await harness.dispose()
    }
  })

  it('delegates live sessions when the document changes externally', async () => {
    const harness = await mount()
    try {
      harness.ctx.emit(
        'settings/updated',
        'agent-default-model' as never,
        { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
        {},
        'provider',
      )
      expect(harness.states.for(harness.agent).override).toBe('delegated')
    } finally {
      await harness.dispose()
    }
  })

  it('never overrides a session that opted out with /tier off', async () => {
    const harness = await mount()
    try {
      harness.states.for(harness.agent).override = 'off'
      harness.ctx.emit('settings/updated', 'agent-default-model' as never, { provider: 'x', model: 'y' }, {}, 'update')
      expect(harness.states.for(harness.agent).override).toBe('off')
    } finally {
      await harness.dispose()
    }
  })

  it('survives a refused settings write', async () => {
    const harness = await mount()
    try {
      harness.defaultModel.fail = true
      expect(() => harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-v4-flash' })).not.toThrow()
      await Promise.resolve()
      expect(harness.defaultModel.writes).toEqual([])
    } finally {
      await harness.dispose()
    }
  })

  it('is a no-op without the default-model service', async () => {
    const ctx = new Context()
    await ctx.plugin(AgentRegistry)
    try {
      const sync = new SelectionSync({ ctx, states: new AgentStateStore() })
      expect(() => sync.noteRoute({ provider: 'a', model: 'b' })).not.toThrow()
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
