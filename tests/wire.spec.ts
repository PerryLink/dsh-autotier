/**
 * Wire contract: the `tier` schemas round-trip the payloads the two faces
 * exchange and reject malformed values, the invocation descriptors carry the
 * shapes the Typert loader and the client registry expect, and the host
 * manifest and the client contribution share one descriptor list — the
 * anti-drift invariant the module exists for.
 *
 * @module dsh-autotier/tests/wire.spec
 */

import { describe, expect, it } from 'vitest'
import { AUTOTIER_REMOTE } from '../src/client/remote.ts'
import { TYPERT } from '../src/typert.host.ts'
import {
  ROUTE_SOURCES,
  TIER_CATALOG_DESCRIPTOR,
  TIER_CATALOG_SCHEMA,
  TIER_INVOCATIONS,
  TIER_SET_MODE_DESCRIPTOR,
  TIER_STATUS_DESCRIPTOR,
  TIER_STATUS_SCHEMA,
  type TierStatus,
} from '../src/wire.ts'
import { ROUTING_MODES } from '../src/types.ts'

/** A complete wire snapshot, as the host service builds it. */
function fullStatus(): TierStatus {
  return {
    mode: 'auto',
    tiers: {
      strong: { provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high' },
      cheap: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
      vision: { provider: 'deepseek-official', model: 'deepseek-v4-flash-vision-exp' },
    },
    guard: { enabled: true, tiers: ['cheap'] },
    escalation: { threshold: 2, windowMs: 60_000, ttlMs: 180_000, fallbackTtlMs: 300_000, signature: true },
    session: {
      agentId: 'session-1',
      override: 'cheap',
      mode: 'cheap',
      appliedTier: 'cheap',
      appliedSource: 'rule',
      escalation: false,
      plan: true,
      denials: 2,
    },
  }
}

describe('TIER_STATUS_SCHEMA', () => {
  it('round-trips a full snapshot including the session view', () => {
    const parsed = TIER_STATUS_SCHEMA.parse(fullStatus())
    expect(parsed.mode).toBe('auto')
    expect(parsed.tiers.cheap).toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-flash' })
    expect(parsed.tiers.strong.effort).toBe('high')
    expect(parsed.session.mode).toBe('cheap')
    expect(parsed.session.appliedSource).toBe('rule')
    expect(parsed.session.denials).toBe(2)
  })

  it('accepts the empty session view the host answers without an agent id', () => {
    const parsed = TIER_STATUS_SCHEMA.parse({
      ...fullStatus(),
      session: {
        agentId: null,
        override: null,
        mode: 'auto',
        appliedTier: null,
        appliedSource: null,
        escalation: false,
        plan: false,
        denials: 0,
      },
    })
    expect(parsed.session.agentId).toBeNull()
  })

  it('rejects an unknown mode, an unknown tier and an unknown source', () => {
    expect(() => TIER_STATUS_SCHEMA.parse({ ...fullStatus(), mode: 'turbo' })).toThrow()
    expect(() => TIER_STATUS_SCHEMA.parse({
      ...fullStatus(),
      tiers: { ...fullStatus().tiers, cheap: { provider: 'p', model: 'm', effort: 'medium' } },
    })).toThrow()
    expect(() => TIER_STATUS_SCHEMA.parse({
      ...fullStatus(),
      session: { ...fullStatus().session, appliedSource: 'vibes' },
    })).toThrow()
  })

  it('rejects a non-integer denial count', () => {
    expect(() => TIER_STATUS_SCHEMA.parse({
      ...fullStatus(),
      session: { ...fullStatus().session, denials: 1.5 },
    })).toThrow()
  })

  it('keeps ROUTE_SOURCES in step with the schema vocabulary', () => {
    for (const source of ROUTE_SOURCES) {
      expect(() => TIER_STATUS_SCHEMA.parse({
        ...fullStatus(),
        session: { ...fullStatus().session, appliedSource: source },
      })).not.toThrow()
    }
  })
})

describe('TIER_CATALOG_SCHEMA', () => {
  it('round-trips a provider/model catalog', () => {
    const parsed = TIER_CATALOG_SCHEMA.parse([
      { provider: 'deepseek-official', models: [{ id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', inputModalities: ['text', 'image'] }] },
      { provider: 'openai', models: [] },
    ])
    expect(parsed).toHaveLength(2)
    expect(parsed[0]?.models[0]?.inputModalities).toEqual(['text', 'image'])
  })

  it('rejects a non-array payload and a missing modality list', () => {
    expect(() => TIER_CATALOG_SCHEMA.parse({ provider: 'x' })).toThrow()
    expect(() => TIER_CATALOG_SCHEMA.parse([{ provider: 'x', models: [{ id: 'a', name: 'A' }] }])).toThrow()
  })
})

describe('tier invocation descriptors', () => {
  it('exposes exactly the three tier endpoints', () => {
    expect(TIER_INVOCATIONS).toHaveLength(3)
    expect(TIER_INVOCATIONS.map(invocation => invocation.method)).toEqual(['status', 'catalog', 'setMode'])
    for (const invocation of TIER_INVOCATIONS) {
      expect(invocation.id).toBe(`dsh-autotier#${invocation.namespace}/${invocation.method}`)
      expect(invocation.service).toBe('tier')
      expect(invocation.namespace).toBe('tier')
      expect(invocation.invocation.kind).toBe('direct')
      expect(invocation.result.mode).toBe('strict')
      expect(Object.isFrozen(invocation)).toBe(true)
    }
  })

  it('declares the optional agentId on tier/status', () => {
    expect(TIER_STATUS_DESCRIPTOR.parameters).toHaveLength(1)
    const parameter = TIER_STATUS_DESCRIPTOR.parameters[0]
    expect(parameter?.name).toBe('agentId')
    expect(parameter?.wire).toBe('agentId')
    expect(parameter?.acceptsUndefined).toBe(true)
    expect(() => parameter?.codec.schema.parse(undefined)).not.toThrow()
    expect(parameter?.codec.schema.parse('session-1')).toBe('session-1')
    expect(() => parameter?.codec.schema.parse(7)).toThrow()
  })

  it('keeps tier/catalog parameterless', () => {
    expect(TIER_CATALOG_DESCRIPTOR.parameters).toHaveLength(0)
  })

  it('requires a mode and an optional agentId on tier/setMode', () => {
    expect(TIER_SET_MODE_DESCRIPTOR.parameters).toHaveLength(2)
    const mode = TIER_SET_MODE_DESCRIPTOR.parameters[0]
    const agentId = TIER_SET_MODE_DESCRIPTOR.parameters[1]
    expect(mode?.name).toBe('mode')
    expect(mode !== undefined && 'acceptsUndefined' in mode && mode.acceptsUndefined === true).toBe(false)
    for (const candidate of ROUTING_MODES) expect(() => mode?.codec.schema.parse(candidate)).not.toThrow()
    expect(() => mode?.codec.schema.parse('turbo')).toThrow()
    expect(agentId?.name).toBe('agentId')
    expect(agentId !== undefined && 'acceptsUndefined' in agentId && agentId.acceptsUndefined).toBe(true)
  })
})

describe('shared descriptor list', () => {
  it('registers the exact same objects on both faces', () => {
    expect(AUTOTIER_REMOTE.package).toBe('dsh-autotier')
    expect(AUTOTIER_REMOTE.descriptors).toBe(TIER_INVOCATIONS)
    expect(TYPERT.package).toBe('dsh-autotier')
    expect(TYPERT.face).toBe('host')
    expect(TYPERT.invocations).toBe(TIER_INVOCATIONS)
    expect(TYPERT.schemas).toEqual([])
    expect(TYPERT.model).toEqual({ services: [], events: [], objects: [] })
  })
})
