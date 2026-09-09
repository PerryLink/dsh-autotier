/**
 * Real AgentLoop integration suite (community five-layer model, layer 5): the
 * published `0.1.2-rc.1` agent loop drives real turns over a recording mock
 * adapter, proving the routing listener actually changes the model the loop
 * dispatches — not merely the config a unit test hands it.
 * @module dsh-autotier/tests/loop-integration.spec
 */

import { Context } from '@deepseek-ai/cordis'
import type { Fiber } from '@deepseek-ai/cordis'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import {
  createUserMessage,
  LlmAdapter,
  ReasoningEffortId,
  type GenerateOptions,
  type LlmResolvedModelInfo,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { describe, expect, it } from 'vitest'
import * as autotier from '../src/index.ts'
import { MemorySettings } from './harness.ts'

/** One recorded dispatch. */
interface RecordedCall {
  provider: string
  model: string
  effort: string | undefined
}

/** A mock provider route that records every dispatch and answers `ok`. */
class RecordingAdapter extends LlmAdapter {
  readonly calls: RecordedCall[] = []

  /** Declare the adapter-owned effort vocabulary so the runtime accepts our routes. */
  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({
      provider,
      id: model,
      name: model,
      reasoning: {
        efforts: ['off', 'low', 'high', 'max'].map(id => ({ id: ReasoningEffortId(id), name: id })),
        defaultEffort: ReasoningEffortId('high'),
      },
    })
  }

  override stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.calls.push({
      provider: options.provider,
      model: options.model,
      effort: options.reasoningEffort === undefined ? undefined : String(options.reasoningEffort),
    })
    const chunks: StreamChunk[] = [
      { type: 'block-start', index: 0, blockType: 'text' },
      { type: 'text-delta', index: 0, text: 'ok' },
      { type: 'block-end', index: 0, block: { type: 'text', text: 'ok' } },
      { type: 'finish', reason: { kind: 'stop' } },
    ]
    return (async function* generate(): AsyncGenerator<StreamChunk> {
      for (const chunk of chunks) yield chunk
    })()
  }
}

/** One composed loop harness. */
interface LoopHarness {
  ctx: Context
  adapter: RecordingAdapter
  agent: Awaited<ReturnType<AgentLoop['create']>>
  pluginFiber: Fiber
}

/**
 * Mount the real loop over the published host packages, register a mock
 * provider route, and create one agent.
 * @param config - plugin configuration overrides.
 */
async function createLoopHarness(config: Parameters<typeof autotier.apply>[1] = {}): Promise<LoopHarness> {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(MemorySettings)
  await ctx.plugin(AgentLoop, { agents: [] })
  const adapter = new RecordingAdapter()
  ctx.llm.registerAdapter(['mock'], adapter)
  const pluginFiber = await ctx.plugin(autotier as unknown as import('@deepseek-ai/cordis').Plugin, {
    tiers: {
      strong: { provider: 'mock', model: 'strong-model', effort: 'high', followSession: false },
      cheap: { provider: 'mock', model: 'cheap-model', effort: 'low', followSession: false },
    },
    ...config,
  })
  const agent = await ctx.agentLoop.create(
    SessionId(`autotier-loop-${String(Math.random()).slice(2, 8)}`),
    { provider: 'mock', model: 'session-default' },
  )
  return { ctx, adapter, agent, pluginFiber }
}

/** Send one user message and wait for the turn to settle. */
async function say(harness: LoopHarness, text: string): Promise<void> {
  harness.agent.followup(createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  }))
  await harness.agent.whenIdle()
}

describe('real AgentLoop routing', () => {
  it('routes a simple instruction to the cheap tier', async () => {
    const harness = await createLoopHarness()
    try {
      await say(harness, 'Hello!')
      expect(harness.adapter.calls.length).toBeGreaterThan(0)
      expect(harness.adapter.calls.at(-1)?.model).toBe('cheap-model')
      expect(harness.adapter.calls.at(-1)?.effort).toBe('low')
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })

  it('routes a complex instruction to the strong tier and opens plan mode', async () => {
    const harness = await createLoopHarness()
    try {
      await say(harness, 'Plan the migration of the storage layer end to end')
      expect(harness.adapter.calls.at(-1)?.model).toBe('strong-model')
      expect(harness.adapter.calls.at(-1)?.effort).toBe('high')
      const status = harness.ctx.get('autotier')
      expect(status).toBeDefined()
      expect(status!.status().mode).toBe('auto')
      const projection = harness.ctx.sessionProjections.stateOf(harness.agent.session, 'autotier' as never) as
        | { plan?: boolean }
        | undefined
      expect(projection?.plan).toBe(true)
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })

  it('honours the /tier command override for the next turn', async () => {
    const harness = await createLoopHarness()
    try {
      await say(harness, 'Hello!')
      expect(harness.adapter.calls.at(-1)?.model).toBe('cheap-model')
      const execution = await harness.ctx.commands.execute(
        harness.agent,
        '/tier strong',
        [],
        new AbortController().signal,
      )
      expect(execution?.result.kind).toBe('success')
      await say(harness, 'Hello again')
      expect(harness.adapter.calls.at(-1)?.model).toBe('strong-model')
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })

  it('leaves the session untouched with /tier off', async () => {
    const harness = await createLoopHarness()
    try {
      await harness.ctx.commands.execute(harness.agent, '/tier off', [], new AbortController().signal)
      await say(harness, 'Plan the whole migration end to end')
      // No routing: the loop's own proposal (the session default) is dispatched.
      expect(harness.adapter.calls.at(-1)?.model).toBe('session-default')
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })

  it('publishes the tier projection from the request headers', async () => {
    const harness = await createLoopHarness()
    try {
      await say(harness, 'Hello!')
      const projection = harness.ctx.sessionProjections.stateOf(harness.agent.session, 'autotier' as never)
      expect(projection).toMatchObject({ provider: 'mock', model: 'cheap-model', effort: 'low' })
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })
})
