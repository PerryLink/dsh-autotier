/**
 * The routing decision state machine: it turns one classified intent plus the
 * per-agent runtime state into the tier to apply, and owns the TTL semantics of
 * escalation, fallback and the judge cooldown. Pure and synchronous — the
 * asynchronous judge call lives in `judge.ts`.
 *
 * @module dsh-autotier/policy
 */

import type { ResolvedConfig } from './config.ts'
import type { IntentInput, IntentResult, RuleHit } from './intent.ts'
import { advanceFallback, fallbackActive, type FallbackRecord } from './tiers.ts'
import type { RouteSource, RoutingMode, TierId } from './types.ts'

/** Mutable per-agent routing state. Never persisted: it is per-process runtime. */
export interface RouteState {
  /** The decision for the newest user input, reused by every step of its turn. */
  decision: IntentResult | undefined
  /** The classifier input the decision was computed from. */
  input: IntentInput | undefined
  /** Session-level override set by `/tier`; `undefined` = follow the configuration. */
  override: RoutingMode | undefined
  /** The tier actually applied to the last request (hysteresis anchor). */
  appliedTier: TierId | undefined
  /** The source that produced `appliedTier`; hysteresis only damps classifier-driven changes. */
  appliedSource: RouteSource | undefined
  /** Plan mode as last observed. */
  planActive: boolean
  /** Failure escalation. */
  escalation: { count: number; signature: string; until: number; rung: number; lastAt: number } | undefined
  /** Fallback-chain position (scoped to one tier). */
  fallback: FallbackRecord | undefined
  /** Judge resilience. */
  judge: { failures: number; lastCall: number }
  /** Attempt-first band: the strong review has already run for this input. */
  verified: boolean
  /** The fingerprint that owes one strong review after a cheap-run signal. */
  reviewOwedFor: string | undefined
  /** The posterior exploration roll, taken once per user input. */
  probe: 'strong' | 'cheap' | undefined
  /** How many calls the guard denied for this agent. */
  denials: number
  /** The last rule the guard fired, for `/tier status`. */
  lastDenial: string
}

/** A fresh per-agent state. */
export function createRouteState(): RouteState {
  return {
    decision: undefined,
    input: undefined,
    override: undefined,
    appliedTier: undefined,
    appliedSource: undefined,
    planActive: false,
    escalation: undefined,
    fallback: undefined,
    judge: { failures: 0, lastCall: 0 },
    verified: false,
    reviewOwedFor: undefined,
    probe: undefined,
    denials: 0,
    lastDenial: '',
  }
}

/** One routing decision with provenance. */
export interface Decision {
  readonly tier: TierId
  readonly source: RouteSource
  readonly reason: string
  readonly confidence: number
}

/** Inputs to {@link decideTier}. */
export interface DecideInput {
  readonly config: ResolvedConfig
  readonly state: RouteState
  readonly intent: IntentResult
  readonly rule: RuleHit | null
  /** Session/plugin override; `undefined` means the configured routing mode. */
  readonly override: RoutingMode | undefined
  readonly now: number
}

/** Whether the current failure escalation is still in force. */
export function escalationActive(state: RouteState, now: number): boolean {
  return state.escalation !== undefined && state.escalation.until > now
}

/**
 * Apply the double-threshold hysteresis to a classifier-driven change. The
 * anchor is only honoured when the applied tier itself came from the
 * classifier: an escalation, plan-mode, rule or manual decision is a deliberate
 * instruction, so returning from it must not be damped (otherwise a session
 * that escalated once never returns to the cheap tier).
 */
function withHysteresis(state: RouteState, proposed: TierId, confidence: number, config: ResolvedConfig): TierId {
  const applied = state.appliedTier
  if (applied === undefined || applied === proposed) return proposed
  const anchorSource = state.appliedSource
  if (anchorSource !== 'judge' && anchorSource !== 'posterior' && anchorSource !== 'default') return proposed
  const { toStrong, toCheap } = config.intent.hysteresis
  if (proposed === 'strong' && confidence < toStrong) return applied
  if (proposed === 'cheap' && confidence >= toCheap) return applied
  return proposed
}

/**
 * Resolve the tier for the current step.
 *
 * Precedence (highest first): explicit override, active failure escalation,
 * plan mode, declarative rule, fingerprint posterior, classifier verdict.
 * Hysteresis applies only to the classifier verdict, so an explicit override
 * or an escalation takes effect immediately.
 *
 * @param input - the live state and the classification.
 * @returns the decision with its provenance.
 */
export function decideTier(input: DecideInput): Decision {
  const { state, config, intent, rule, override, now } = input
  if (override === 'strong' || override === 'cheap') {
    return { tier: override, source: 'manual', reason: `/tier ${override}`, confidence: 1 }
  }
  if (escalationActive(state, now)) {
    return {
      tier: 'strong',
      source: 'escalation',
      reason: `escalated after ${String(state.escalation?.count ?? 0)} failure(s)`,
      confidence: 1,
    }
  }
  if (state.planActive) {
    return { tier: 'strong', source: 'plan-mode', reason: 'plan mode is active', confidence: 1 }
  }
  if (fallbackActive(state.fallback, now)) {
    return {
      tier: intent.tier,
      source: 'fallback',
      reason: `fallback chain entry ${String((state.fallback?.index ?? 0) + 1)}`,
      confidence: intent.confidence,
    }
  }
  if (rule !== null) {
    return { tier: rule.tier, source: 'rule', reason: `rule ${rule.id}`, confidence: 1 }
  }
  // The posterior opinion (including its exploration roll) is taken once per
  // user input by the router and stored on the state, so a tool-loop step
  // cannot re-roll it into a different tier.
  const posterior = state.probe ?? null
  if (posterior !== null) {
    return {
      tier: posterior,
      source: 'posterior',
      reason: `fingerprint ${intent.fingerprint} posterior`,
      confidence: 1,
    }
  }
  const tier = withHysteresis(state, intent.tier, intent.confidence, config)
  const source: RouteSource = intent.shortCircuit !== undefined ? 'rule' : 'judge'
  const reason = tier === intent.tier
    ? intent.reasons.join('; ')
    : `hysteresis kept ${tier} (proposed ${intent.tier} at confidence ${intent.confidence.toFixed(2)})`
  return { tier, source, reason, confidence: intent.confidence }
}

/** Whether the low-confidence judge should be consulted for this input. */
export function judgeNeeded(
  config: ResolvedConfig,
  state: RouteState,
  intent: IntentResult,
  rule: RuleHit | null,
  now: number,
): boolean {
  if (!config.intent.judge.enabled) return false
  if (rule !== null) return false
  if (intent.shortCircuit !== undefined) return false
  if (intent.confidence >= config.intent.ruleThreshold) return false
  if (state.judge.failures >= config.intent.judge.unavailableSkip) return false
  return now - state.judge.lastCall >= config.intent.judge.cooldownMs
}

/** Whether the middle band should start cheap and verify on a signal. */
export function attemptBandApplies(config: ResolvedConfig, intent: IntentResult): boolean {
  if (!config.intent.attemptBand.enabled) return false
  if (intent.shortCircuit !== undefined) return false
  return intent.confidence >= config.intent.attemptBand.tauLow && intent.confidence < config.intent.ruleThreshold
}

/** Record one judge call attempt. */
export function noteJudgeCall(state: RouteState, now: number, ok: boolean): void {
  state.judge.lastCall = now
  state.judge.failures = ok ? 0 : state.judge.failures + 1
}

/**
 * Record one failure against the escalation counter.
 * @param state - the agent's state.
 * @param signature - the failure signature (`code|fingerprint`); only identical
 *   signatures accumulate when `escalation.signature` is enabled.
 * @param config - the resolved configuration.
 * @param now - current epoch millis.
 * @returns whether this failure escalated the tier.
 */
export function noteFailure(state: RouteState, signature: string, config: ResolvedConfig, now: number): boolean {
  const current = state.escalation
  const sameSignature = config.escalation.signature ? current?.signature === signature : true
  const withinWindow = current !== undefined && now - current.lastAt <= config.escalation.windowMs
  const count = sameSignature && current !== undefined && withinWindow ? current.count + 1 : 1
  const escalated = count >= config.escalation.threshold
  state.escalation = {
    count,
    signature: config.escalation.signature ? signature : '',
    until: escalated ? now + config.escalation.ttlMs : (current?.until ?? 0),
    rung: escalated ? (current?.rung ?? 0) + 1 : (current?.rung ?? 0),
    lastAt: now,
  }
  return escalated
}

/** Clear an expired escalation lazily. A record that never escalated keeps its window count. */
export function clearExpiredEscalation(state: RouteState, now: number): void {
  if (state.escalation !== undefined && state.escalation.until > 0 && state.escalation.until <= now) {
    state.escalation = undefined
  }
}

/**
 * Advance the agent's fallback chain for one tier after an unusable route.
 * @returns whether a chain entry was taken (false = chain exhausted).
 */
export function noteFallback(
  state: RouteState,
  tier: TierId,
  chainLength: number,
  config: ResolvedConfig,
  now: number,
): boolean {
  const next = advanceFallback(state.fallback, tier, chainLength, now, config.escalation.fallbackTtlMs)
  if (next === null) {
    if (state.fallback?.tier === tier) state.fallback = undefined
    return false
  }
  state.fallback = next
  return true
}
