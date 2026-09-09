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

/**
 * Tool argument keys that carry a filesystem target. `file_path` is specific
 * enough to trust on any tool; the looser keys are only read from tools whose
 * name says they write, so a tool with an unrelated `target` argument (a window
 * handle, a selector) cannot trip the path rules.
 */
const STRICT_PATH_KEYS = ['file_path'] as const
const LOOSE_PATH_KEYS = ['path', 'target', 'file', 'filename'] as const

/** Tool names whose `path`-like arguments are filesystem targets. */
const WRITE_TOOL_PATTERN = /(?:write|edit|patch|create|delete|remove|move|copy|rename|save|apply|mkdir|touch)/iu

/**
 * Secret shapes that must never reach a model-visible denial reason or the
 * session log. The matched snippet is the one place user text could leak into
 * the guard's output, so it is redacted before it is composed.
 */
const SECRET_PATTERNS: readonly RegExp[] = [
  /(bearer\s+)[A-Za-z0-9._~+/=-]{8,}/giu,
  /\bsk-[A-Za-z0-9._-]{8,}/gu,
  /\bgh[pousr]_[A-Za-z0-9]{8,}/gu,
  /((?:password|passwd|token|secret|api[_-]?key)\s*[=:]\s*)\S+/giu,
]

/** Redact credential-shaped spans from one snippet. */
export function redactSnippet(text: string): string {
  let redacted = text
  for (const pattern of SECRET_PATTERNS) redacted = redacted.replace(pattern, '$1<redacted>')
  return redacted
}

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

/**
 * Whether a path sits inside a configured protected surface. Windows resolves
 * case-insensitively and strips trailing dots/spaces from each segment, so the
 * comparison normalizes both before matching; otherwise `PACKAGE.JSON` and
 * `package.json.` would slip past the guard.
 */
function isProtectedPath(path: string, protectedPaths: readonly string[]): string | undefined {
  const normalize = (value: string): string => {
    const slashed = value.replace(/\\/gu, '/')
    if (process.platform !== 'win32') return slashed
    return slashed
      .split('/')
      .map(segment => segment.replace(/[. ]+$/u, '').toLowerCase())
      .join('/')
  }
  const normalized = normalize(path)
  for (const entry of protectedPaths) {
    const needle = normalize(entry).replace(/^\.\//u, '')
    if (normalized === needle || normalized.endsWith(`/${needle}`) || normalized.includes(`/${needle}/`)) return entry
  }
  return undefined
}

/** Whether a command or path is whitelisted (exact, or a path/word boundary prefix). */
function isWhitelisted(value: string | undefined, toolName: string, whitelist: readonly string[]): boolean {
  if (whitelist.includes(toolName)) return true
  if (value === undefined) return false
  return whitelist.some((entry) => {
    if (value === entry) return true
    const rest = value.slice(entry.length)
    if (!value.startsWith(entry) || rest === '') return false
    // A prefix only whitelists on a real boundary, so `/tmp/scratch` does not
    // cover `/tmp/scratch-malicious`.
    return /^[\s/\\]/u.test(rest)
  })
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
  // The path axis only applies to tools that write: a `read` of package.json or
  // AGENTS.md is routine cheap-tier work, and upstream's rule set is explicit
  // that reads are never intercepted.
  const path = WRITE_TOOL_PATTERN.test(input.toolName)
    ? pick(input.args, STRICT_PATH_KEYS) ?? pick(input.args, LOOSE_PATH_KEYS)
    : undefined
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
        reason: `dsh-autotier guard: "${redactSnippet(path)}" is a protected surface (${protectedEntry}). `
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
        reason: `dsh-autotier guard: ${redactSnippet(hit.description)}. This command is denied while the cheap tier executes; `
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
        reason: `dsh-autotier guard: ${redactSnippet(hit.description)}. Credential and key material is denied while the cheap tier `
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
      // A broken guard is fail-closed for the call it was judging: the agent is
      // forced onto the strong tier (where the guard does not apply) and the
      // current call is denied. Letting it through would turn one defect into an
      // open door, which is exactly what this guard exists to prevent.
      ctx.logger.error('dsh-autotier: guard malfunction (%o); forcing escalation and denying the call', error)
      if (agent !== undefined) {
        const state = states.for(agent)
        const config = service.config()
        const now = Date.now()
        noteFailure(state, `guard|${String(error)}`, config, now)
        // Force the escalation immediately: one malfunction is enough.
        state.escalation = {
          count: config.escalation.threshold,
          signature: `guard|${String(error)}`,
          until: now + config.escalation.ttlMs,
          rung: (state.escalation?.rung ?? 0) + 1,
          lastAt: now,
        }
      }
      return {
        kind: 'deny',
        reason: 'dsh-autotier guard: the guard itself failed, so this call was denied. '
          + 'The session is escalated to the strong tier — re-run the call there.',
      }
    }
  }, { prepend: true })
}

/** Re-exported for the status surface. */
export { isCredentialPath }
