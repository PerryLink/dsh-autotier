/**
 * Client presenter and locale suite: the pill's tone/badge, the click cycle,
 * the locale-key mapping, and the catalog flattening are pure functions of the
 * wire payload (no I/O, no clock, no React), so they replay deterministically
 * in a plain node environment. The dictionaries are checked for key parity —
 * the bilingual constraint the locale registry enforces at registration.
 *
 * @module dsh-autotier/tests/client-present.spec
 */

import { describe, expect, it } from 'vitest'
import {
  catalogEntries,
  landings,
  landingText,
  modalityText,
  modeKey,
  nextMode,
  PILL_CYCLE,
  pillView,
  statusDetail,
  tierKey,
} from '../src/client/present.ts'
import { en, zh, type AutotierLocaleKey } from '../src/client/locales.ts'
import { ROUTING_MODES, type RoutingMode } from '../src/types.ts'
import type { TierStatus } from '../src/wire.ts'

/** A ready snapshot with the given session mode and extras. */
function status(over: Partial<TierStatus['session']> = {}, mode: TierStatus['mode'] = 'auto'): TierStatus {
  return {
    mode,
    tiers: {
      strong: { provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high' },
      cheap: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
      vision: { provider: 'deepseek-official', model: 'deepseek-v4-flash-vision-exp' },
    },
    guard: { enabled: true, tiers: ['cheap'] },
    escalation: { threshold: 2, windowMs: 60_000, ttlMs: 180_000, fallbackTtlMs: 300_000, signature: true },
    session: {
      agentId: 'session-1',
      override: null,
      mode,
      appliedTier: null,
      appliedSource: null,
      escalation: false,
      plan: false,
      denials: 0,
      ...over,
    },
  }
}

describe('pill view', () => {
  it('labels the four visible states and the delegated one', () => {
    expect(pillView(status({ mode: 'auto' })).label).toBe('AUTO')
    expect(pillView(status({ mode: 'strong', override: 'strong' })).label).toBe('STRONG')
    expect(pillView(status({ mode: 'cheap', override: 'cheap' })).label).toBe('CHEAP')
    expect(pillView(status({ mode: 'off', override: 'off' })).label).toBe('OFF')
    expect(pillView(status({ mode: 'delegated', override: 'delegated' })).label).toBe('DELEGATED')
  })

  it('keys the tone off the effective session mode, not the composition mode', () => {
    const view = pillView(status({ mode: 'cheap', override: 'cheap' }, 'auto'))
    expect(view.mode).toBe('cheap')
    expect(view.tone).toBe('cheap')
  })

  it('raises the escalation badge only while an escalation is active', () => {
    expect(pillView(status()).escalation).toBe(false)
    expect(pillView(status({ escalation: true })).escalation).toBe(true)
  })

  it('summarizes the session state for the tooltip', () => {
    const detail = statusDetail(status({ override: 'strong', mode: 'strong', appliedTier: 'strong', appliedSource: 'escalation', plan: true, escalation: true, denials: 3 }))
    expect(detail).toBe('mode=strong · override=strong · applied=strong(escalation) · plan · escalation · denials=3')
    expect(statusDetail(status())).toBe('mode=auto')
  })
})

describe('mode cycle', () => {
  it('cycles auto -> strong -> cheap -> off -> auto', () => {
    expect(PILL_CYCLE).toEqual(['auto', 'strong', 'cheap', 'off'])
    expect(nextMode('auto')).toBe('strong')
    expect(nextMode('strong')).toBe('cheap')
    expect(nextMode('cheap')).toBe('off')
    expect(nextMode('off')).toBe('auto')
  })

  it('restarts the cycle from an off-cycle mode', () => {
    expect(nextMode('delegated')).toBe('auto')
  })

  it('maps every routing mode to its own dictionary key', () => {
    const keys = ROUTING_MODES.map(mode => modeKey(mode))
    expect(new Set(keys).size).toBe(ROUTING_MODES.length)
    for (const key of keys) expect(zh[key]).toBeDefined()
  })

  it('maps both tiers to dictionary keys', () => {
    expect(tierKey('strong')).toBe('tierStrong')
    expect(tierKey('cheap')).toBe('tierCheap')
  })
})

describe('landing and catalog presentation', () => {
  it('renders a landing with and without an explicit effort', () => {
    expect(landingText({ provider: 'p', model: 'm', effort: 'high' })).toBe('p/m @high')
    expect(landingText({ provider: 'p', model: 'm' })).toBe('p/m')
  })

  it('lists the three landings in display order', () => {
    expect(landings(status()).map(entry => entry.tier)).toEqual(['strong', 'cheap', 'vision'])
  })

  it('renders modalities with a text fallback', () => {
    expect(modalityText({ id: 'a', name: 'A', inputModalities: ['text', 'image'] })).toBe('text, image')
    expect(modalityText({ id: 'a', name: 'A', inputModalities: [] })).toBe('text')
  })

  it('flattens the catalog preserving provider and model order', () => {
    const entries = catalogEntries([
      { provider: 'p1', models: [{ id: 'a', name: 'A', inputModalities: ['text'] }, { id: 'b', name: 'B', inputModalities: ['text'] }] },
      { provider: 'p2', models: [{ id: 'c', name: 'C', inputModalities: ['text'] }] },
    ])
    expect(entries.map(entry => entry.value)).toEqual(['p1/a', 'p1/b', 'p2/c'])
    expect(entries[1]?.provider).toBe('p1')
    expect(entries[1]?.model.name).toBe('B')
    expect(catalogEntries([])).toEqual([])
  })
})

describe('dictionaries', () => {
  it('ships the same key set in en and zh', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })

  it('has non-empty copy for every key', () => {
    for (const key of Object.keys(zh) as AutotierLocaleKey[]) {
      expect(zh[key].length).toBeGreaterThan(0)
      expect(en[key].length).toBeGreaterThan(0)
    }
  })

  it('covers every routing mode', () => {
    for (const mode of ROUTING_MODES) {
      const key: AutotierLocaleKey = modeKey(mode as RoutingMode)
      expect(en[key]).not.toBe('')
    }
  })
})
