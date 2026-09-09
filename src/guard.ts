/**
 * The high-risk guard: a deterministic, tier-conditional denial on
 * `tools/pre-execute`. It protects the cheap tier only — the strong model is
 * the reviewer — and it never weakens `dsh-defend`, the approval service or the
 * sandbox policy.
 *
 * Failure discipline: a guard that throws escalates the agent to the strong
 * tier and lets the call through. Denying every call on a guard bug would turn
 * one defect into a dead session; the escalation keeps the safety property
 * (the strong model reviews) without breaking the turn.
 *
 * @module dsh-autotier/guard
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-tools'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import type { ResolvedConfig } from './config.ts'
import { isCredentialPath, matchCommand, matchPath } from './guard-rules.ts'
import { noteFailure } from './policy.ts'
import type { AutotierService } from './service.ts'
import type { AgentStateStore } from './state.ts'
import type { TierId } from './types.ts'

/** Tool argument keys that carry a shell command. */
const COMMAND_KEYS = ['command', 'cmd', 'script'] as const

/** Tool argument keys that carry a filesystem target. */
const PATH_KEYS = ['file_path', 'path', 'target', 'file', 'filename'] as const

/** The guard's verdict for one call. */
export interface GuardVerdict {
  readonly action: 'allow' | 'deny'
  /** Empty for `allow`. */
  readonly reason: string
  /** The rule id that fired, or `''`. */
  readonly rule: string
  /** Which axis matched. */
  readonly axis: 'command' | 'path' | 'protected-path' | 'none'
}

/** One call as the guard sees it. */
export interface GuardInput {
  readonly toolName: string
  readonly args: unknown
  readonly tier: TierId
  readonly config: ResolvedConfig
  /** Resolved sandbox mode, when the policy service is composed. */
  readonly sandboxMode?: string
}

/** Extract the first string-valued key present in `args`. */
function pick(args: unknown, keys: readonly string[]): string | undefined {
  if (args === null || typeof args !== 'object') return undefined
  const record = args as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

/** Whether one path sits inside a configured protected surface. */
function isProtectedPath(path: string, protectedPaths: readonly string[]): string | undefined {
  const normalized = path.replace(/\\/gu, '/')
  for (const entry of protectedPaths) {
    const needle = entry.replace(/\\/gu, '/').replace(/^\.\//u, '')
    if (normalized === needle || normalized.endsWith(`/${needle}`) || normalized.includes(`/${needle}/`)) return entry
  }
  return undefined
}

/** Whether a command or path is whitelisted. */
function isWhitelisted(value: string | undefined, toolName: string, whitelist: readonly string[]): boolean {
  if (whitelist.includes(toolName)) return true
  if (value === undefined) return false
  return whitelist.some(entry => value === entry || value.startsWith(`${entry} `) || value.startsWith(entry))
}

/**
 * Judge one tool call.
 *
 * Order: the guard must be enabled and the executing tier protected, then the
 * whitelist, then the credential/command rules, then the protected-path review
 * rule. A denial names the rule and tells the model to escalate instead of
 * retrying.
 *
 * @param input - the call, the executing tier and the live configuration.
 * @returns the verdict.
 */
export function evaluateToolCall(input: GuardInput): GuardVerdict {
  const { config, tier } = input
  if (!config.guard.enabled) return { action: 'allow', reason: '', rule: '', axis: 'none' }
  if (!config.guard.tiers.includes('cheap') || tier !== 'cheap') {
    return { action: 'allow', reason: '', rule: '', axis: 'none' }
  }
  const command = pick(input.args, COMMAND_KEYS)
  const path = pick(input.args, PATH_KEYS)
  if (isWhitelisted(command ?? path, input.toolName, config.guard.whitelist)) {
    return { action: 'allow', reason: '', rule: '', axis: 'none' }
  }
  if (path !== undefined) {
    const protectedEntry = isProtectedPath(path, config.guard.protectedPaths)
    if (protectedEntry !== undefined) {
      return {
        action: 'deny',
        rule: 'protected-path',
        axis: 'protected-path',
        reason: `dsh-autotier guard: "${path}" is a protected surface (${protectedEntry}). `
          + 'Modifying it requires the strong tier; report what you intend to change instead of retrying.',
      }
    }
  }
  if (command !== undefined) {
    const hit = matchCommand(command)
    if (hit !== null) {
      return {
        action: 'deny',
        rule: hit.rule,
        axis: 'command',
        reason: `dsh-autotier guard: ${hit.description}. This command is denied while the cheap tier executes; `
          + 'the tier will escalate if the task needs it — do not retry the command.',
      }
    }
  }
  if (path !== undefined) {
    const hit = matchPath(path)
    if (hit !== null) {
      return {
        action: 'deny',
        rule: hit.rule,
        axis: 'path',
        reason: `dsh-autotier guard: ${hit.description}. Credential and key material is denied while the cheap tier `
          + 'executes; the tier will escalate if the task needs it.',
      }
    }
  }
  return { action: 'allow', reason: '', rule: '', axis: 'none' }
}

/** The tier the guard believes is executing one call. */
function tierOf(states: AgentStateStore, agent: Agent | undefined): TierId | undefined {
  if (agent === undefined) return undefined
  const state = states.for(agent)
  // An explicit session override outranks the last applied tier, and an active
  // escalation means the strong tier is reviewing.
  if (state.override === 'strong') return 'strong'
  if (state.override === 'off') return undefined
  if (state.override === 'cheap') return 'cheap'
  if (state.escalation !== undefined && state.escalation.until > Date.now()) return 'strong'
  // Otherwise the tier of the request that produced this step is executing it.
  return state.appliedTier ?? 'cheap'
}

/** Options for {@link registerGuardHook}. */
export interface GuardHookOptions {
  readonly ctx: Context
  readonly service: AutotierService
  readonly states: AgentStateStore
}

/**
 * Register the `tools/pre-execute` guard.
 *
 * The listener is registered with `{ prepend: true }` so a denial claims the
 * call before any pass-through listener; every allowed call awaits `next()`.
 *
 * @param options - the plugin context, service and state store.
 */
export function registerGuardHook({ ctx, service, states }: GuardHookOptions): void {
  ctx.on('tools/pre-execute', async (exec: ToolExecution, next: () => Promise<PreToolDecision>): Promise<PreToolDecision> => {
    const agent = exec.agent
    try {
      const tier = tierOf(states, agent)
      if (tier === undefined) return next()
      const sandbox = ctx.get('sandboxPolicy') as { resolve(request: { session?: unknown }): { mode?: string } } | undefined
      const sandboxMode = sandbox === undefined || agent === undefined
        ? undefined
        : sandbox.resolve({ session: agent.session }).mode
      const verdict = evaluateToolCall({
        toolName: exec.name,
        args: exec.arguments,
        tier,
        config: service.config(),
        ...sandboxMode === undefined ? {} : { sandboxMode },
      })
      if (verdict.action === 'allow') return next()
      ctx.logger.warn(
        'dsh-autotier: guard denied %s on the %s tier (rule %s)%s',
        exec.name,
        tier,
        verdict.rule,
        sandboxMode === undefined ? '' : ` [sandbox ${sandboxMode}]`,
      )
      if (agent !== undefined) {
        const state = states.for(agent)
        state.denials += 1
        state.lastDenial = verdict.rule
      }
      return { kind: 'deny', reason: verdict.reason }
    } catch (error) {
      // A broken guard must not become an open door, and must not kill the
      // session: escalate to the strong tier and let the call proceed.
      ctx.logger.error('dsh-autotier: guard malfunction (%o); escalating to the strong tier', error)
      if (agent !== undefined) {
        const state = states.for(agent)
        noteFailure(state, `guard|${String(error)}`, service.config(), Date.now())
      }
      return next()
    }
  }, { prepend: true })
}

/** Re-exported for the status surface. */
export { isCredentialPath }
