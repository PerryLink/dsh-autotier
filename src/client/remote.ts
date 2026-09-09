/**
 * The client-side Remote face of the `tier` namespace: the hand-written
 * `TypertRemoteContribution` mounted through `ctx.remote.$mount`, plus the
 * declaration merging that types `ctx.remote.tier`. The descriptor list is
 * shared with the host `./typert` manifest (`../wire.ts`), so the two faces can
 * never drift.
 *
 * @module dsh-autotier/client/remote
 */

import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import type { RoutingMode } from '../types.ts'
import { TIER_INVOCATIONS } from '../wire.ts'
import type { TierCatalog, TierStatus } from '../wire.ts'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespace$tier {
    /** Read the status snapshot for one session (the slot identity). */
    status: (agentId?: string) => Promise<RemoteResult<TierStatus>>
    /** Read the live registered provider/model catalog. */
    catalog: () => Promise<RemoteResult<TierCatalog>>
    /** Pin or clear this session's routing mode override. */
    setMode: (mode: RoutingMode, agentId?: string) => Promise<RemoteResult<TierStatus>>
  }
  interface TypertRemoteMap {
    'tier/status': (agentId?: string) => Promise<RemoteResult<TierStatus>>
    'tier/catalog': () => Promise<RemoteResult<TierCatalog>>
    'tier/setMode': (mode: RoutingMode, agentId?: string) => Promise<RemoteResult<TierStatus>>
  }
  interface TypertRemoteNamespaceMap {
    tier: TypertRemoteNamespace$tier
  }
}

/** The client Remote contribution for the `tier` namespace. */
export const AUTOTIER_REMOTE = Object.freeze({
  package: 'dsh-autotier',
  descriptors: TIER_INVOCATIONS,
} satisfies TypertRemoteContribution)
