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
  /**
   * The documented selection, mutated by an external actor (the GUI's model
   * picker) the way the real service mutates its own volatile config.
   */
  documented: { provider: string; model: string; reasoningEffort?: string } = {
    provider: 'deepseek-official',
    model: 'deepseek-v4-pro',
    reasoningEffort: 'high',
  }

  currentSelection(): { provider: string; model: string; reasoningEffort?: string } {
    return this.documented
  }

  async saveSelection(next: { provider: string; model: string; reasoningEffort?: string }): Promise<void> {
    if (this.fail) throw new Error('settings write refused')
    this.writes.push(next)
    this.documented = next
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
      harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-flash', effort: 'low' })
      harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-flash', effort: 'low' })
      await Promise.resolve()
      expect(harness.defaultModel.writes).toEqual([
        { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'low' },
      ])
    } finally {
      await harness.dispose()
    }
  })

  it('treats its own mirrored write as its own on the next landing', async () => {
    const harness = await mount()
    try {
      harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high' })
      await Promise.resolve()
      // The document now holds exactly what we wrote, so re-reading it is not
      // an external change and nothing is delegated.
      harness.sync.observeExternalSelection()
      expect(harness.states.for(harness.agent).override).toBeUndefined()
      // And the repeat landing is recognised as already mirrored.
      harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high' })
      await Promise.resolve()
      expect(harness.defaultModel.writes).toHaveLength(1)
    } finally {
      await harness.dispose()
    }
  })

  it('delegates live sessions when the document changes externally', async () => {
    const harness = await mount()
    try {
      // Establish ownership of the document first: before this plugin writes,
      // "not ours" is the composition default, not a user override.
      harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-flash', effort: 'low' })
      await Promise.resolve()
      // The user picks a different model in the GUI.
      harness.defaultModel.documented = { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'high' }
      harness.sync.observeExternalSelection()
      expect(harness.states.for(harness.agent).override).toBe('delegated')
    } finally {
      await harness.dispose()
    }
  })

  it('never overrides a session that opted out with /tier off', async () => {
    const harness = await mount()
    try {
      harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-flash', effort: 'low' })
      await Promise.resolve()
      harness.states.for(harness.agent).override = 'off'
      harness.defaultModel.documented = { provider: 'x', model: 'y' }
      harness.sync.observeExternalSelection()
      expect(harness.states.for(harness.agent).override).toBe('off')
    } finally {
      await harness.dispose()
    }
  })

  it('does not mistake the composition default for a user override', async () => {
    const harness = await mount()
    try {
      // Nothing has been mirrored yet, so the documented selection ("deepseek-v4-pro")
      // is whatever the deployment started with — not an override of a routing
      // decision this plugin made. Routing must not delegate on that alone.
      harness.sync.observeExternalSelection()
      expect(harness.states.for(harness.agent).override).toBeUndefined()
    } finally {
      await harness.dispose()
    }
  })

  it('keeps routing when the external read throws', async () => {
    const harness = await mount()
    try {
      harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-flash', effort: 'low' })
      await Promise.resolve()
      harness.defaultModel.currentSelection = () => { throw new Error('document unreadable') }
      expect(() => { harness.sync.observeExternalSelection() }).not.toThrow()
      expect(harness.states.for(harness.agent).override).toBeUndefined()
    } finally {
      await harness.dispose()
    }
  })

  it('survives a refused settings write', async () => {
    const harness = await mount()
    try {
      harness.defaultModel.fail = true
      expect(() => harness.sync.noteRoute({ provider: 'deepseek-official', model: 'deepseek-flash' })).not.toThrow()
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
