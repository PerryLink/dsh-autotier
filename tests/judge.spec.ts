/**
 * Judge-call suite: the wire options of the auxiliary intent classifier
 * (thinking off, no temperature), the configurable effort/budget, the schema
 * default, and every fallback that keeps a failed judge from breaking routing.
 * @module dsh-autotier/tests/judge.spec
 */

import type { Context } from '@deepseek-ai/cordis'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { Config, escalationLadder, parseJudgeLabel, resolveConfig, runJudge } from '../src/index.ts'

/** A fake LLM face recording every judge request. */
interface FakeLlm {
  ctx: Context
  calls: GenerateOptions[]
}

/**
 * Build a context whose only real surface is `ctx.llm`.
 * @param stream - the response factory; receives the request options.
 * @param models - ids the fake catalog reports.
 */
function fakeLlm(
  stream: (options: GenerateOptions) => AsyncIterable<StreamChunk>,
  models: readonly string[] = ['deepseek-flash'],
): FakeLlm {
  const calls: GenerateOptions[] = []
  const ctx = {
    llm: {
      listModels: () => Promise.resolve(models.map(id => ({ id }))),
      stream: (options: GenerateOptions) => {
        calls.push(options)
        return stream(options)
      },
    },
  }
  return { ctx: ctx as unknown as Context, calls }
}

/** A complete answer stream for one label. */
function textStream(label: string): (options: GenerateOptions) => AsyncIterable<StreamChunk> {
  return () => (async function* generate(): AsyncGenerator<StreamChunk> {
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text: label }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: label } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  })()
}

/** A stream that only ever waits for the fused abort signal. */
function hangingStream(options: GenerateOptions): AsyncIterable<StreamChunk> {
  return (async function* generate(): AsyncGenerator<StreamChunk> {
    yield* [] as StreamChunk[]
    await new Promise<never>((_, reject) => {
      options.signal?.addEventListener('abort', () => { reject(new Error('aborted')) }, { once: true })
    })
  })()
}

/** A stream that fails before yielding anything. */
function failingStream(): AsyncIterable<StreamChunk> {
  return (async function* generate(): AsyncGenerator<StreamChunk> {
    yield* [] as StreamChunk[]
    throw new Error('mock transport down')
  })()
}

describe('judge request options', () => {
  it('runs with thinking off and without a temperature', async () => {
    const { ctx, calls } = fakeLlm(textStream('coding'))
    const outcome = await runJudge(ctx, resolveConfig({}), 'hello', new AbortController().signal)
    expect(outcome).toMatchObject({ ok: true, scenario: 'coding', tier: 'cheap' })
    expect(calls).toHaveLength(1)
    const options = calls[0]!
    // The regression: thinking defaults to `high`, so this call must opt out.
    expect(String(options.reasoningEffort)).toBe('off')
    // Sampling is silently ignored in thinking mode; the judge does not send it.
    expect(options.temperature).toBeUndefined()
    expect(options.maxTokens).toBe(16)
    expect(options.model).toBe('deepseek-flash')
  })

  it('takes the effort, budget and timeout from the configuration', async () => {
    const config = resolveConfig({
      intent: { judge: { model: 'judge-model', effort: 'low', maxTokens: 64, timeoutMs: 5_000 } },
    })
    const { ctx, calls } = fakeLlm(textStream('review'))
    const outcome = await runJudge(ctx, config, 'hello', new AbortController().signal)
    expect(outcome).toMatchObject({ ok: true, scenario: 'review', tier: 'strong' })
    expect(String(calls[0]!.reasoningEffort)).toBe('low')
    expect(calls[0]!.maxTokens).toBe(64)
  })

  it('keeps the documented defaults and rejects an unknown effort', () => {
    expect(Config({}).intent.get()?.judge).toMatchObject({ effort: 'off', maxTokens: 16, timeoutMs: 2_000 })
    expect(resolveConfig({}).intent.judge).toMatchObject({ effort: 'off', maxTokens: 16, timeoutMs: 2_000 })
    // A value outside the adapter vocabulary is a dead configuration.
    expect(() => Config({ intent: { judge: { effort: 'medium' } } } as never)).toThrow()
    expect(() => resolveConfig({ intent: { judge: { effort: 'medium' } } } as never)).toThrow(/intent\.judge\.effort/u)
  })

  it('is not re-enabled by the tier escalation ladder', async () => {
    const config = resolveConfig({
      tiers: {
        strong: { provider: 'mock', model: 'strong-model', effort: 'high', followSession: false },
        cheap: { provider: 'mock', model: 'cheap-model', effort: 'low', followSession: false },
      },
      intent: { judge: { model: 'judge-model' } },
    })
    // The ladder climbs the cheap model's effort before switching models...
    const rungs = escalationLadder(
      { provider: 'mock', model: 'cheap-model' },
      { provider: 'mock', model: 'cheap-model', effort: 'low' },
      { provider: 'mock', model: 'strong-model', effort: 'high' },
    )
    expect(rungs.map(rung => rung.route.effort)).toEqual(['high', 'max', 'high'])
    // ...but the judge call is outside it and still runs with thinking off.
    const { ctx, calls } = fakeLlm(textStream('coding'))
    await runJudge(ctx, config, 'hello', new AbortController().signal)
    expect(String(calls[0]!.reasoningEffort)).toBe('off')
  })
})

describe('judge fallback paths', () => {
  it('reports a missing model instead of throwing', async () => {
    const { ctx } = fakeLlm(textStream('coding'), [])
    const outcome = await runJudge(ctx, resolveConfig({}), 'hello', new AbortController().signal)
    expect(outcome).toEqual({
      ok: false,
      scenario: undefined,
      tier: undefined,
      detail: 'no judge model available',
    })
  })

  it('reports its own timeout', async () => {
    const config = resolveConfig({ intent: { judge: { model: 'judge-model', timeoutMs: 10 } } })
    const { ctx } = fakeLlm(hangingStream)
    const outcome = await runJudge(ctx, config, 'hello', new AbortController().signal)
    expect(outcome).toMatchObject({ ok: false, detail: 'judge timed out' })
  })

  it('reports a transport error', async () => {
    const config = resolveConfig({ intent: { judge: { model: 'judge-model' } } })
    const { ctx } = fakeLlm(failingStream)
    const outcome = await runJudge(ctx, config, 'hello', new AbortController().signal)
    expect(outcome).toMatchObject({ ok: false, detail: 'judge failed: mock transport down' })
  })

  it('reports an answer without a known label', async () => {
    const { ctx } = fakeLlm(textStream('banana'))
    const outcome = await runJudge(ctx, resolveConfig({}), 'hello', new AbortController().signal)
    expect(outcome).toMatchObject({ ok: false, detail: 'judge answer carried no known label' })
  })

  it('parses the first label in a noisy answer', () => {
    expect(parseJudgeLabel('The label is planning.')).toBe('planning')
    expect(parseJudgeLabel('  CODING  ')).toBe('coding')
    expect(parseJudgeLabel('banana')).toBeUndefined()
    expect(parseJudgeLabel('')).toBeUndefined()
  })
})
