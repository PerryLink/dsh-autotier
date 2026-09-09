/**
 * The two read-only tools: `tier_status` reports the live routing state, and
 * `tier_route` dry-runs the classifier on one intent string without sending a
 * model request.
 * @module dsh-autotier/tools
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import { classifyIntent } from './intent.ts'
import { escalationActive } from './policy.ts'
import type { AutotierService } from './service.ts'
import type { AgentStateStore } from './state.ts'

/** Services the tools read. */
export interface ToolServices {
  readonly service: AutotierService
  readonly states: AgentStateStore
}

/** Render one canonical value as a single text block. */
function textBlock(value: unknown): { type: 'text'; text: string }[] {
  return [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }]
}

/** Build the `tier_status` tool. */
export function tierStatusTool({ service, states }: ToolServices): ToolDefinition {
  return defineTool({
    name: 'tier_status',
    description:
      'Report the live dsh-autotier routing state: the configured tier landings, the effective mode for this session, the last intent classification, and whether a failure escalation or fallback is in force. Read-only.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          mode: { type: 'string' },
          strong: { type: 'string' },
          cheap: { type: 'string' },
          vision: { type: 'string' },
          guardEnabled: { type: 'boolean' },
          appliedTier: { type: 'string' },
          lastScenario: { type: 'string' },
          lastConfidence: { type: 'number' },
          escalated: { type: 'boolean' },
          planActive: { type: 'boolean' },
          guardDenials: { type: 'integer' },
          lastDenialRule: { type: 'string' },
        },
      },
      render: (_args, value) => textBlock(value),
    },
    execute: async (_args, exec) => {
      const agent = exec.agent as Agent | undefined
      const state = agent === undefined ? undefined : states.for(agent)
      const status = service.status()
      return {
        mode: state?.override ?? status.mode,
        strong: `${status.tiers.strong.provider}/${status.tiers.strong.model}${status.tiers.strong.effort === undefined ? '' : `@${status.tiers.strong.effort}`}`,
        cheap: `${status.tiers.cheap.provider}/${status.tiers.cheap.model}${status.tiers.cheap.effort === undefined ? '' : `@${status.tiers.cheap.effort}`}`,
        vision: `${status.tiers.vision.provider}/${status.tiers.vision.model}`,
        guardEnabled: status.guard.enabled,
        appliedTier: state?.appliedTier ?? '',
        lastScenario: state?.decision?.scenario ?? '',
        lastConfidence: state?.decision?.confidence ?? 0,
        escalated: state === undefined ? false : escalationActive(state, Date.now()),
        planActive: state?.planActive ?? false,
        guardDenials: state?.denials ?? 0,
        lastDenialRule: state?.lastDenial ?? '',
      }
    },
  })
}

/** Build the `tier_route` tool. */
export function tierRouteTool({ service }: ToolServices): ToolDefinition {
  return defineTool({
    name: 'tier_route',
    description:
      'Dry-run the intent classifier on one instruction and report which tier it would use, without sending a model request. Read-only.',
    parameters: {
      text: { type: 'string', description: 'The instruction to classify.', required: true as const },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tier: { type: 'string' },
          scenario: { type: 'string' },
          confidence: { type: 'number' },
          fingerprint: { type: 'string' },
          reason: { type: 'string' },
        },
      },
      render: (_args, value) => textBlock(value),
    },
    execute: async (args) => {
      const config = service.config()
      const result = classifyIntent({
        text: args.text,
        toolNames: [],
        hasImage: false,
        messageCount: 0,
        cwd: '',
      }, { rules: service.rules(), scenarios: config.intent.scenarios })
      return {
        tier: result.tier,
        scenario: result.scenario,
        confidence: result.confidence,
        fingerprint: result.fingerprint,
        reason: result.reasons.join('; '),
      }
    },
  })
}

/**
 * Register both tools on the plugin fiber.
 * @param ctx - the plugin context (must have `tools`).
 * @param services - the service and the state store.
 */
export function registerTierTools(ctx: Context, services: ToolServices): void {
  ctx.tools.register(tierStatusTool(services))
  ctx.tools.register(tierRouteTool(services))
}
