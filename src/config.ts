/**
 * The explicit-resolve judge for dsh-autotier: it re-checks every default,
 * bound and cross-field requirement field by field, so programmatic
 * construction that bypasses Schemastery normalization still fails loud. The
 * schema itself lives in `schema.ts`.
 *
 * @module dsh-autotier/config
 */

import { isVolatile, type Volatile } from '@deepseek-ai/cosmokit'
import {
  COST_MODES,
  EFFORT_IDS,
  ROUTING_MODES,
  SCENARIOS,
  type CostMode,
  type EffortId,
  type RoutingMode,
} from './types.ts'
import { DEFAULT_CHEAP, DEFAULT_STRONG, DEFAULT_VISION } from './schema.ts'
import type {
  Config,
  EscalationConfig,
  GuardConfig,
  IntentConfig,
  JudgeConfig,
  ScenarioToggles,
  TierConfig,
  VisionConfig,
  VolatileConfig,
} from './schema.ts'

export { Config } from './schema.ts'
export type {
  EscalationConfig,
  FallbackEntry,
  GuardConfig,
  IntentConfig,
  IntentRule,
  JudgeConfig,
  ScenarioToggles,
  TierConfig,
  VisionConfig,
  VolatileConfig,
} from './schema.ts'

/**
 * Read one config field that may arrive as a live reference or as plain data.
 * The Loader hands `apply` a `VolatileConfig` (every section is a reference);
 * a programmatic mount, a test, or `scripts/` hands plain data. Both faces feed
 * the same resolver, so neither can drift from the other.
 *
 * `Volatile.get()` answers a deeply-readonly snapshot. The resolvers below read
 * these values and then produce their own frozen output, so the read-only view
 * is exactly the contract wanted; the cast re-widens it to the mutable field
 * type so those signatures do not have to carry `readonly` everywhere.
 *
 * @param value - the field as handed to the plugin.
 * @returns the current snapshot value.
 */
function unwrap<T>(value: Volatile<T> | T): T | undefined {
  return isVolatile(value) ? (value.get() as T | undefined) : value
}

/**
 * Read the plain-data config out of either accepted face.
 *
 * `exactOptionalPropertyTypes` is on, so an absent section is omitted rather
 * than set to `undefined`: the resolvers below treat "key absent" and "key
 * undefined" alike, but only the omitted form is assignable to `Config`.
 *
 * @param raw - the plugin configuration as received.
 * @returns the plain-data config every resolver below reads.
 */
function plain(raw: Config | VolatileConfig | undefined): Config {
  if (raw === undefined) return {}
  const tiers = unwrap(raw.tiers)
  const intent = unwrap(raw.intent)
  const guard = unwrap(raw.guard)
  const escalation = unwrap(raw.escalation)
  return {
    ...tiers === undefined ? {} : { tiers },
    ...intent === undefined ? {} : { intent },
    ...guard === undefined ? {} : { guard },
    ...escalation === undefined ? {} : { escalation },
    ...raw.routingMode === undefined ? {} : { routingMode: raw.routingMode },
  }
}

/** One resolved fallback landing. */
export interface ResolvedFallbackEntry {
  provider: string
  model: string
}

/** One resolved tier landing. Runtime-frozen by {@link resolveConfig}. */
export interface ResolvedTierConfig {
  provider: string
  model: string
  effort: EffortId
  followSession: boolean
  fallback: ResolvedFallbackEntry[]
}

/** One fully-resolved declarative rule. */
export interface ResolvedRule {
  id: string
  when: { patterns: string[]; tools: string[]; cwd: string }
  tier: 'cheap' | 'strong'
  priority: number
}

/** Fully-resolved configuration: every field present, runtime-frozen. */
export interface ResolvedConfig {
  tiers: {
    strong: ResolvedTierConfig
    cheap: ResolvedTierConfig
    vision: Required<VisionConfig>
  }
  intent: {
    ruleThreshold: number
    attemptBand: { enabled: boolean; tauLow: number }
    hysteresis: { toStrong: number; toCheap: number }
    rules: ResolvedRule[]
    judge: Required<JudgeConfig>
    scenarios: Required<ScenarioToggles>
    costMode: CostMode
  }
  guard: {
    enabled: boolean
    tiers: ('cheap')[]
    whitelist: string[]
    protectedPaths: string[]
    interopDefend: 'auto' | 'none'
  }
  escalation: {
    threshold: number
    windowMs: number
    ttlMs: number
    fallbackTtlMs: number
    signature: boolean
  }
  routingMode: RoutingMode
}

/** Throw the standard fail-loud config error for one invalid field. */
function invalid(field: string, detail: string): never {
  throw new Error(`dsh-autotier: config.${field} ${detail}`)
}

/** Read a required non-empty string field, failing loud when absent or blank. */
function text(field: string, value: string | undefined, fallback: string): string {
  const resolved = value ?? fallback
  if (typeof resolved !== 'string' || resolved.trim().length === 0) invalid(field, 'must be a non-empty string')
  return resolved
}

/** Read a bounded finite number. */
function number(field: string, value: number | undefined, fallback: number, min: number, max: number): number {
  const resolved = value ?? fallback
  if (!Number.isFinite(resolved) || resolved < min || resolved > max) {
    invalid(field, `must be a finite number in [${String(min)}, ${String(max)}]`)
  }
  return resolved
}

/** Read an integer in a closed range. */
function integer(field: string, value: number | undefined, fallback: number, min: number, max: number): number {
  const resolved = value ?? fallback
  if (!Number.isInteger(resolved) || resolved < min || resolved > max) {
    invalid(field, `must be an integer in [${String(min)}, ${String(max)}]`)
  }
  return resolved
}

/** Read a boolean switch. */
function boolean(field: string, value: boolean | undefined, fallback: boolean): boolean {
  const resolved = value ?? fallback
  if (typeof resolved !== 'boolean') invalid(field, 'must be a boolean')
  return resolved
}

/** Read one member of a closed string set. */
function member<T extends string>(field: string, value: string | undefined, fallback: T, allowed: readonly T[]): T {
  const resolved = value ?? fallback
  if (!(allowed as readonly string[]).includes(resolved)) {
    invalid(field, `must be one of ${allowed.join(', ')}`)
  }
  return resolved as T
}

/** Resolve one tier, judging its landing, effort vocabulary and fallback chain. */
function resolveTier(
  tier: 'strong' | 'cheap',
  raw: TierConfig | undefined,
  fallback: { provider: string; model: string; effort: EffortId; followSession: boolean },
): ResolvedTierConfig {
  const provider = text(`tiers.${tier}.provider`, raw?.provider, fallback.provider)
  const model = text(`tiers.${tier}.model`, raw?.model, fallback.model)
  const effort = member(`tiers.${tier}.effort`, raw?.effort, fallback.effort, EFFORT_IDS)
  const followSession = boolean(`tiers.${tier}.followSession`, raw?.followSession, fallback.followSession)
  const chain: ResolvedFallbackEntry[] = []
  const seen = new Set<string>([`${provider}/${model}`])
  for (const [index, entry] of (raw?.fallback ?? []).entries()) {
    const entryProvider = text(`tiers.${tier}.fallback[${String(index)}].provider`, entry.provider, '')
    const entryModel = text(`tiers.${tier}.fallback[${String(index)}].model`, entry.model, '')
    const key = `${entryProvider}/${entryModel}`
    if (seen.has(key)) {
      invalid(`tiers.${tier}.fallback[${String(index)}]`, `duplicates the tier landing or an earlier fallback (${key})`)
    }
    seen.add(key)
    chain.push({ provider: entryProvider, model: entryModel })
  }
  return { provider, model, effort, followSession, fallback: chain }
}

/** Resolve the intent section. */
function resolveIntent(raw: IntentConfig | undefined): ResolvedConfig['intent'] {
  const intent = raw ?? {}
  const ruleThreshold = number('intent.ruleThreshold', intent.ruleThreshold, 0.7, 0.000001, 1)
  const tauLow = number('intent.attemptBand.tauLow', intent.attemptBand?.tauLow, 0.45, 0, 1)
  if (tauLow >= ruleThreshold) {
    invalid('intent.attemptBand.tauLow', `must stay below intent.ruleThreshold (${String(tauLow)} >= ${String(ruleThreshold)})`)
  }
  const toStrong = number('intent.hysteresis.toStrong', intent.hysteresis?.toStrong, 0.8, 0, 1)
  const toCheap = number('intent.hysteresis.toCheap', intent.hysteresis?.toCheap, 0.6, 0, 1)
  if (toCheap >= toStrong) {
    invalid('intent.hysteresis', `toCheap (${String(toCheap)}) must stay below toStrong (${String(toStrong)})`)
  }
  const rules: ResolvedRule[] = []
  const ruleIds = new Set<string>()
  for (const [index, rule] of (intent.rules ?? []).entries()) {
    const id = text(`intent.rules[${String(index)}].id`, rule.id, '')
    if (ruleIds.has(id)) invalid(`intent.rules[${String(index)}].id`, `duplicates rule id ${JSON.stringify(id)}`)
    ruleIds.add(id)
    const priority = rule.priority ?? 0
    if (!Number.isFinite(priority)) invalid(`intent.rules[${String(index)}].priority`, 'must be a finite number')
    const patterns = [...(rule.when?.patterns ?? [])]
    const tools = [...(rule.when?.tools ?? [])]
    if (patterns.length === 0 && tools.length === 0) {
      invalid(`intent.rules[${String(index)}].when`, 'must declare at least one pattern or tool')
    }
    for (const [patternIndex, pattern] of patterns.entries()) {
      if (typeof pattern !== 'string' || pattern.length === 0) {
        invalid(`intent.rules[${String(index)}].when.patterns[${String(patternIndex)}]`, 'must be a non-empty regular expression')
      }
      try {
        // Compile with the same flags `compileRules` uses, so a pattern the
        // judge accepts can never throw later inside a settings watcher.
        new RegExp(pattern, 'u')
      } catch (error) {
        invalid(
          `intent.rules[${String(index)}].when.patterns[${String(patternIndex)}]`,
          `is not a valid regular expression (${String(error)})`,
        )
      }
    }
    for (const [toolIndex, tool] of tools.entries()) {
      if (typeof tool !== 'string' || tool.trim().length === 0) {
        invalid(`intent.rules[${String(index)}].when.tools[${String(toolIndex)}]`, 'must be a non-empty tool name')
      }
    }
    rules.push({
      id,
      when: { patterns, tools, cwd: rule.when?.cwd ?? '' },
      tier: member(`intent.rules[${String(index)}].tier`, rule.tier, 'strong', ['cheap', 'strong'] as const),
      priority,
    })
  }
  const judge = intent.judge ?? {}
  const judgeModel = judge.model ?? ''
  if (typeof judgeModel !== 'string') invalid('intent.judge.model', 'must be a string (empty = auto)')
  const scenarios = Object.fromEntries(SCENARIOS.map(scenario => [
    scenario,
    boolean(`intent.scenarios.${scenario}`, intent.scenarios?.[scenario], true),
  ])) as Required<ScenarioToggles>
  return {
    ruleThreshold,
    attemptBand: { enabled: boolean('intent.attemptBand.enabled', intent.attemptBand?.enabled, false), tauLow },
    hysteresis: { toStrong, toCheap },
    rules,
    judge: {
      enabled: boolean('intent.judge.enabled', judge.enabled, true),
      model: judgeModel,
      temperature: number('intent.judge.temperature', judge.temperature, 0, 0, 2),
      maxTokens: integer('intent.judge.maxTokens', judge.maxTokens, 16, 1, 4_096),
      cooldownMs: number('intent.judge.cooldownMs', judge.cooldownMs, 30_000, 0, 3_600_000),
      timeoutMs: number('intent.judge.timeoutMs', judge.timeoutMs, 2_000, 1, 120_000),
      unavailableSkip: integer('intent.judge.unavailableSkip', judge.unavailableSkip, 2, 0, 100),
    },
    scenarios,
    costMode: member('intent.costMode', intent.costMode, 'balanced', COST_MODES),
  }
}

/** Resolve the guard section. */
function resolveGuard(raw: GuardConfig | undefined): ResolvedConfig['guard'] {
  const guard = raw ?? {}
  const whitelist = [...(guard.whitelist ?? [])]
  for (const [index, entry] of whitelist.entries()) {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      invalid(`guard.whitelist[${String(index)}]`, 'must be a non-empty string')
    }
  }
  const protectedPaths = [...(guard.protectedPaths ?? ['.dsh', 'AGENTS.md', 'package.json', '.github/workflows'])]
  for (const [index, entry] of protectedPaths.entries()) {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      invalid(`guard.protectedPaths[${String(index)}]`, 'must be a non-empty path or glob')
    }
  }
  const tiers: ('cheap')[] = guard.tiers === undefined ? ['cheap'] : guard.tiers.map((tier, index) => {
    if (tier !== 'cheap') invalid(`guard.tiers[${String(index)}]`, 'must be "cheap"')
    return tier
  })
  if (tiers.length === 0) {
    invalid('guard.tiers', 'must list at least one tier; use guard.enabled=false to disable the guard')
  }
  return {
    enabled: boolean('guard.enabled', guard.enabled, true),
    tiers,
    whitelist,
    protectedPaths,
    interopDefend: member('guard.interopDefend', guard.interopDefend, 'auto', ['auto', 'none'] as const),
  }
}

/** Resolve the escalation section. */
function resolveEscalation(raw: EscalationConfig | undefined): ResolvedConfig['escalation'] {
  const escalation = raw ?? {}
  return {
    threshold: integer('escalation.threshold', escalation.threshold, 2, 1, 100),
    windowMs: number('escalation.windowMs', escalation.windowMs, 60_000, 1, 86_400_000),
    ttlMs: number('escalation.ttlMs', escalation.ttlMs, 180_000, 1, 86_400_000),
    fallbackTtlMs: number('escalation.fallbackTtlMs', escalation.fallbackTtlMs, 300_000, 1, 86_400_000),
    signature: boolean('escalation.signature', escalation.signature, true),
  }
}

/** Deep-freeze a resolved configuration tree. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested)
    Object.freeze(value)
  }
  return value
}

/**
 * The landing a tier actually resolves to. `followSession` tiers omit their
 * effort, so two tiers that differ only by a configured-but-ignored effort are
 * the same landing and must be rejected.
 */
function effectiveLanding(tier: ResolvedTierConfig): string {
  return tier.followSession
    ? `${tier.provider}/${tier.model}@session`
    : `${tier.provider}/${tier.model}@${tier.effort}`
}

/**
 * Resolve raw config to the frozen runtime policy, re-judging every default,
 * bound and cross-field requirement.
 *
 * The cross-field judgement is the whole reason this module exists, and it is
 * NOT expressed in the Schemastery schema: the host validates a form write
 * against the schema alone, so a violation this function catches (a strong and
 * a cheap tier landing on the same route, `hysteresis.toCheap >= toStrong`, a
 * rule with neither a pattern nor a tool) would otherwise persist and only fail
 * later. Every actor that can change the configuration therefore routes through
 * here — the Loader at mount, and `settings.ts` on each `loader/volatile-update`
 * — and refuses the change instead of storing something unroutable.
 *
 * @param raw - raw loader config; `undefined` for a bare row. Accepts both the
 *   Loader's `VolatileConfig` face and the plain-data `Config` face.
 * @returns the frozen resolved config.
 * @throws {Error} when a value is out of bounds or a cross-field requirement fails.
 */
export function resolveConfig(raw: Config | VolatileConfig | undefined): ResolvedConfig {
  const source = plain(raw)
  const tiers = source.tiers ?? {}
  const strong = resolveTier('strong', tiers.strong, DEFAULT_STRONG)
  const cheap = resolveTier('cheap', tiers.cheap, DEFAULT_CHEAP)
  const strongTriple = effectiveLanding(strong)
  const cheapTriple = effectiveLanding(cheap)
  if (strongTriple === cheapTriple) {
    invalid('tiers', `strong and cheap resolve to the same landing (${strongTriple}); tiering would be a no-op`)
  }
  const resolved: ResolvedConfig = {
    tiers: {
      strong,
      cheap,
      vision: {
        provider: text('tiers.vision.provider', tiers.vision?.provider, DEFAULT_VISION.provider),
        model: text('tiers.vision.model', tiers.vision?.model, DEFAULT_VISION.model),
      },
    },
    intent: resolveIntent(source.intent),
    guard: resolveGuard(source.guard),
    escalation: resolveEscalation(source.escalation),
    routingMode: member('routingMode', source.routingMode, 'auto', ROUTING_MODES),
  }
  return deepFreeze(resolved)
}

/**
 * Judge a configuration without keeping the resolved value.
 *
 * @param value - the configuration to judge.
 * @throws {Error} when the configuration is invalid.
 * @deprecated The host no longer offers a `settings.register` validate hook, so
 *   this is no longer wired as a save-time gate. {@link resolveConfig} is the
 *   single judge and is called directly at mount and on every live update; this
 *   alias remains exported because it is part of the plugin's published surface.
 */
export function validateConfig(value: Config | VolatileConfig): void {
  resolveConfig(value)
}
