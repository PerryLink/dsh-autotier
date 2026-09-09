/**
 * The low-confidence judge: a cheap model classifies intent only. It is called
 * when the deterministic layer's confidence falls below `intent.ruleThreshold`,
 * never on cooldown, and never while the previous calls are failing — the
 * classifier's own verdict is always the fallback.
 *
 * @module dsh-autotier/judge
 */

import type { Context } from '@deepseek-ai/cordis'
import { BlockAssembler, createUserMessage, type GenerateOptions } from '@deepseek-ai/dsh-llm'
import type { ResolvedConfig } from './config.ts'
import type { Scenario, TierId } from './types.ts'

/** The label vocabulary the judge is asked to choose from. */
export const JUDGE_LABELS: readonly { readonly label: string; readonly scenario: Scenario }[] = [
  { label: 'coding', scenario: 'coding' },
  { label: 'review', scenario: 'review' },
  { label: 'planning', scenario: 'planning' },
  { label: 'retrieval', scenario: 'retrieval' },
  { label: 'batch', scenario: 'batch' },
  { label: 'daily', scenario: 'daily' },
  { label: 'longText', scenario: 'longText' },
  { label: 'multimodal', scenario: 'multimodal' },
]

/** Which tier a judged scenario lands on. */
const LABEL_TIER: Record<Scenario, TierId> = {
  coding: 'cheap',
  review: 'strong',
  planning: 'strong',
  retrieval: 'cheap',
  batch: 'cheap',
  daily: 'cheap',
  longText: 'strong',
  multimodal: 'strong',
}

/** The judge's answer. */
export interface JudgeOutcome {
  /** Whether the call produced a usable label. */
  readonly ok: boolean
  readonly scenario: Scenario | undefined
  readonly tier: TierId | undefined
  /** Short diagnostic; safe for logs (no prompt text). */
  readonly detail: string
}

/** The route the judge call uses. */
export interface JudgeRoute {
  readonly provider: string
  readonly model: string
}

/**
 * Resolve the judge route: the configured model, else the first catalog model
 * whose id contains `flash` on the cheap tier's provider.
 * @param ctx - the plugin context (reads `ctx.llm`).
 * @param config - the resolved configuration.
 * @returns the route, or undefined when no candidate exists.
 */
export async function resolveJudgeRoute(ctx: Context, config: ResolvedConfig): Promise<JudgeRoute | undefined> {
  const provider = config.tiers.cheap.provider
  if (config.intent.judge.model !== '') {
    return { provider, model: config.intent.judge.model }
  }
  try {
    const models = await ctx.llm.listModels(provider)
    const flash = models.find(model => model.id.toLowerCase().includes('flash'))
    if (flash !== undefined) return { provider, model: flash.id }
    const first = models[0]
    return first === undefined ? undefined : { provider, model: first.id }
  } catch {
    return undefined
  }
}

/** Extract the first label that appears in the judge's answer. */
export function parseJudgeLabel(answer: string): Scenario | undefined {
  const text = answer.trim().toLowerCase()
  if (text === '') return undefined
  for (const entry of JUDGE_LABELS) {
    const label = entry.label.toLowerCase()
    if (new RegExp(`(^|[^a-z])${label}([^a-z]|$)`, 'u').test(text)) return entry.scenario
  }
  return undefined
}

/**
 * Run one judge call.
 * @param ctx - the plugin context (reads `ctx.llm`).
 * @param config - the resolved configuration.
 * @param text - the newest user message text.
 * @param signal - the turn's abort signal; the judge adds its own timeout.
 * @returns the outcome; a failure is reported, never thrown.
 */
export async function runJudge(
  ctx: Context,
  config: ResolvedConfig,
  text: string,
  signal: AbortSignal,
): Promise<JudgeOutcome> {
  const route = await resolveJudgeRoute(ctx, config)
  if (route === undefined) return { ok: false, scenario: undefined, tier: undefined, detail: 'no judge model available' }
  const labels = JUDGE_LABELS.map(entry => entry.label).join(', ')
  const prompt = [
    'Classify the user request into exactly one label.',
    `Labels: ${labels}`,
    'Reply with the label only, no punctuation or explanation.',
    '',
    `Request: ${text.slice(0, 2_000)}`,
  ].join('\n')
  const timeout = AbortSignal.timeout(config.intent.judge.timeoutMs)
  const fused = AbortSignal.any([signal, timeout])
  const options: GenerateOptions = {
    provider: route.provider,
    model: route.model,
    messages: [createUserMessage({
      content: [{ type: 'text', text: prompt }],
      source: { kind: 'plugin', plugin: 'dsh-autotier' },
    })],
    temperature: config.intent.judge.temperature,
    maxTokens: config.intent.judge.maxTokens,
    signal: fused,
  }
  const assembler = new BlockAssembler()
  try {
    for await (const chunk of ctx.llm.stream(options)) assembler.push(chunk)
  } catch (error) {
    return {
      ok: false,
      scenario: undefined,
      tier: undefined,
      detail: timeout.aborted ? 'judge timed out' : `judge failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
  const finish = assembler.finish
  if (finish.kind === 'error' || finish.kind === 'aborted') {
    return { ok: false, scenario: undefined, tier: undefined, detail: `judge stream ended with ${finish.kind}` }
  }
  const answer = assembler.blocks()
    .filter((block): block is Extract<ReturnType<BlockAssembler['blocks']>[number], { type: 'text' }> => block.type === 'text')
    .map(block => block.text)
    .join(' ')
  const scenario = parseJudgeLabel(answer)
  if (scenario === undefined) {
    return { ok: false, scenario: undefined, tier: undefined, detail: 'judge answer carried no known label' }
  }
  return { ok: true, scenario, tier: LABEL_TIER[scenario], detail: `judge chose ${scenario}` }
}
