/**
 * Pure presentation helpers for the autotier client surfaces: the pill's tone
 * and badge, the mode cycle, locale-key mapping, and the catalog flattening.
 * Every function is a pure function of the wire payload — replay-safe and
 * unit-testable without a browser or a React runtime.
 *
 * @module dsh-autotier/client/present
 */

import type { RoutingMode, TierId, TierRoute } from '../types.ts'
import type { TierCatalog, TierModelInfo, TierStatus } from '../wire.ts'
import type { AutotierLocaleKey } from './locales.ts'

/** The four visible pill states plus the delegated one. */
export type TierTone = 'auto' | 'strong' | 'cheap' | 'delegated' | 'off'

/** The composer pill's derived view. */
export interface TierPillView {
  /** Effective mode for the session the pill is bound to. */
  readonly mode: RoutingMode
  /** Visual tone, keyed off the effective mode. */
  readonly tone: TierTone
  /** Uppercase badge text (`AUTO` | `STRONG` | `CHEAP` | `OFF` | `DELEGATED`). */
  readonly label: string
  /** Whether the escalation badge is shown. */
  readonly escalation: boolean
  /** Technical one-line summary used as the button's tooltip. */
  readonly detail: string
}

/**
 * The pill's click cycle. `delegated` is deliberately absent: it names a state
 * the session carries by itself, not a mode a click should pin. The Settings
 * card still offers every mode.
 */
export const PILL_CYCLE: readonly RoutingMode[] = ['auto', 'strong', 'cheap', 'off']

/** One flattened catalog option. */
export interface TierCatalogEntry {
  /** Stable option value: `provider/modelId`. */
  readonly value: string
  readonly provider: string
  readonly model: TierModelInfo
}

/** The next mode in the pill's cycle (an off-cycle mode restarts at `auto`). */
export function nextMode(mode: RoutingMode): RoutingMode {
  const index = PILL_CYCLE.indexOf(mode)
  if (index === -1) return 'auto'
  return PILL_CYCLE[(index + 1) % PILL_CYCLE.length] ?? 'auto'
}

/** The locale key naming one routing mode. */
export function modeKey(mode: RoutingMode): AutotierLocaleKey {
  switch (mode) {
    case 'auto': return 'modeAuto'
    case 'strong': return 'modeStrong'
    case 'cheap': return 'modeCheap'
    case 'delegated': return 'modeDelegated'
    case 'off': return 'modeOff'
  }
}

/** The locale key naming one tier. */
export function tierKey(tier: TierId): AutotierLocaleKey {
  return tier === 'strong' ? 'tierStrong' : 'tierCheap'
}

/** The pill view for one status snapshot. */
export function pillView(status: TierStatus): TierPillView {
  const mode = status.session.mode
  return {
    mode,
    tone: mode,
    label: mode.toUpperCase(),
    escalation: status.session.escalation,
    detail: statusDetail(status),
  }
}

/** The technical one-line summary of a snapshot (never localized). */
export function statusDetail(status: TierStatus): string {
  const parts = [`mode=${status.session.mode}`]
  if (status.session.override !== null) parts.push(`override=${status.session.override}`)
  if (status.session.appliedTier !== null) {
    const source = status.session.appliedSource === null ? '' : `(${status.session.appliedSource})`
    parts.push(`applied=${status.session.appliedTier}${source}`)
  }
  if (status.session.plan) parts.push('plan')
  if (status.session.escalation) parts.push('escalation')
  if (status.session.denials > 0) parts.push(`denials=${status.session.denials}`)
  return parts.join(' · ')
}

/** Render one tier landing: `provider/model`, with ` @effort` when it carries one. */
export function landingText(route: TierRoute): string {
  const base = `${route.provider}/${route.model}`
  return route.effort === undefined ? base : `${base} @${route.effort}`
}

/** Render one model's input modalities. */
export function modalityText(model: TierModelInfo): string {
  return model.inputModalities.length === 0 ? 'text' : model.inputModalities.join(', ')
}

/** Flatten the catalog into select options, preserving provider/model order. */
export function catalogEntries(catalog: TierCatalog): readonly TierCatalogEntry[] {
  const entries: TierCatalogEntry[] = []
  for (const provider of catalog) {
    for (const model of provider.models) {
      entries.push({ value: `${provider.provider}/${model.id}`, provider: provider.provider, model })
    }
  }
  return entries
}

/** The three configured landings in display order. */
export function landings(status: TierStatus): readonly { readonly tier: TierId | 'vision'; readonly route: TierRoute }[] {
  return [
    { tier: 'strong', route: status.tiers.strong },
    { tier: 'cheap', route: status.tiers.cheap },
    { tier: 'vision', route: status.tiers.vision },
  ]
}
