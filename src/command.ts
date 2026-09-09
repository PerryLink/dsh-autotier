/**
 * The `/tier` command: a session-scoped escape hatch over the automatic
 * routing. `auto` returns the session to routing, `strong`/`cheap` pin it,
 * `off` disables routing entirely, and `status` prints the live decision state.
 * @module dsh-autotier/command
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-commands'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import { escalationActive } from './policy.ts'
import type { AutotierService } from './service.ts'
import type { AgentStateStore } from './state.ts'
import { ROUTING_MODES, type RoutingMode } from './types.ts'

/** Format the tier table for `/tier status`. */
function statusText(service: AutotierService, state: ReturnType<AgentStateStore['for']>): string {
  const status = service.status()
  const strong = status.tiers.strong
  const cheap = status.tiers.cheap
  const lines = [
    `dsh-autotier — mode: ${state.override ?? status.mode}`,
    `strong: ${strong.provider}/${strong.model}${strong.effort === undefined ? ' (follows session effort)' : ` @${strong.effort}`}`,
    `cheap:  ${cheap.provider}/${cheap.model}${cheap.effort === undefined ? ' (follows session effort)' : ` @${cheap.effort}`}`,
    `vision: ${status.tiers.vision.provider}/${status.tiers.vision.model}`,
    `guard:  ${status.guard.enabled ? 'on' : 'off'} (${status.guard.tiers.join(', ')})`,
  ]
  const decision = state.decision
  if (decision !== undefined) {
    lines.push(`last intent: ${decision.scenario} (confidence ${decision.confidence.toFixed(2)}, fingerprint ${decision.fingerprint})`)
    if (decision.reasons.length > 0) lines.push(`  because: ${decision.reasons.join('; ')}`)
  }
  if (state.appliedTier !== undefined) lines.push(`applied tier: ${state.appliedTier}`)
  if (escalationActive(state, Date.now())) {
    lines.push(`escalation: active for ${String(Math.ceil(((state.escalation?.until ?? 0) - Date.now()) / 1000))}s`)
  }
  if (state.fallback !== undefined) lines.push(`fallback: chain entry ${String(state.fallback.index + 1)}`)
  if (state.planActive) lines.push('plan mode: active (strong tier)')
  if (state.denials > 0) lines.push(`guard denials: ${String(state.denials)} (last rule ${state.lastDenial})`)
  return lines.join('\n')
}

/**
 * Register the `/tier` command on the plugin fiber.
 * @param ctx - the plugin context (must have `commands`).
 * @param service - the live service.
 * @param states - the per-agent state store.
 */
export function registerTierCommand(ctx: Context, service: AutotierService, states: AgentStateStore): void {
  ctx.commands.register({
    name: 'tier',
    description: 'Show or set this session\'s model tier (auto | strong | cheap | delegated | off | status).',
    input: { hint: 'auto | strong | cheap | delegated | off | status' },
    handler: ({ agent, rawInput }): CommandResult => {
      const argument = rawInput.trim().toLowerCase()
      const state = states.for(agent)
      if (argument === '' || argument === 'status') {
        return { kind: 'success', text: statusText(service, state) }
      }
      const mode = ROUTING_MODES.find(candidate => candidate === argument)
      if (mode === undefined) {
        return { kind: 'error', text: `unknown tier mode ${JSON.stringify(argument)}; use auto | strong | cheap | off | status` }
      }
      state.override = mode === 'auto' ? undefined : (mode as RoutingMode)
      const status = service.status()
      const effective = state.override ?? status.mode
      return {
        kind: 'success',
        text: `dsh-autotier: session mode set to ${effective}\n${statusText(service, state)}`,
      }
    },
  })
}
