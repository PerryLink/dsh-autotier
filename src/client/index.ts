/**
 * `dsh-autotier`, browser half: mounts the `tier` Remote contribution, then
 * registers the composer tier pill into `conversation.input.left` and the
 * autotier card into the Plugins settings section (`settings.plugins.tab`, id
 * `autotier`). All data arrives through the `remote.tier` namespace — the pill
 * binds the session id the slot factory hands it, the Settings card resolves the
 * session currently open in the shell through the sessions store face.
 *
 * @module dsh-autotier/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: declares the client `remote` service (with `$mount`) on the cordis Context.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the 'settings.plugins.tab' SlotMap declaration into this program.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the 'conversation.input.left' SlotMap declaration into this program.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { RoutingMode } from '../types.ts'
import type { TierCatalog, TierStatus } from '../wire.ts'
import { TierPill, type TierPillInjected } from './TierPill.tsx'
import { TierSettingsCard, type TierSettingsInjected } from './TierSettingsCard.tsx'
import { en, zh } from './locales.ts'
import { AUTOTIER_REMOTE } from './remote.ts'
import { installAutotierStyles } from './styles.ts'

export type { TierPillInjected, TierPillProps } from './TierPill.tsx'
export type { TierSettingsCardProps, TierSettingsInjected } from './TierSettingsCard.tsx'
export type { AutotierLocaleKey } from './locales.ts'
export {
  catalogEntries,
  landingText,
  landings,
  modalityText,
  modeKey,
  nextMode,
  PILL_CYCLE,
  pillView,
  statusDetail,
  tierKey,
} from './present.ts'
export type { TierCatalogEntry, TierPillView, TierTone } from './present.ts'

/**
 * Minimal structural contract of the slot registry this client uses. Declared
 * locally because the registry's owning package differs across harness lines
 * (the removed client runtime on 0.1.1-rc.2, the UI renderer on 0.1.2-alpha);
 * the runtime contract is structural. `inject` defers the registration until
 * the target slot is declared; the `inject` factory of a session-scope entry
 * receives the framework-resolved session id.
 */
interface SlotsFace {
  inject(slot: string, factory: () => unknown): unknown
  register(options: Record<string, unknown>, component: unknown): unknown
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.autotier'

/** Plugin name: matches the package name, the graph row id, and the bundle id. */
export const name = 'dsh-autotier'

/** Services the browser half reads; `remote.tier` appears once this plugin mounts its contribution. */
export const inject = ['slots', 'locale', 'remote']

/**
 * Browser plugin body: dictionaries, the scoped stylesheet, the Remote
 * contribution mount, the composer pill and the Settings card.
 *
 * @param ctx - client root context.
 */
export async function apply(ctx: ClientContext): Promise<void> {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-autotier: dictionaries')
  ctx.effect(() => installAutotierStyles(), 'dsh-autotier: stylesheet')

  // $mount registers the 'remote.tier' namespace service and owns its removal
  // for this fiber's lifetime.
  await ctx.remote.$mount(AUTOTIER_REMOTE)

  const slots = ctx.get('slots') as unknown as SlotsFace
  ctx.inject(['remote.tier'], (scope) => {
    const t = scope.locale.bind(NS)
    const unwrap = <T,>(result: RemoteResult<T>, method: string): T => {
      if (!result.ok) {
        throw new Error(`tier.${method} failed: ${result.error.code}: ${result.error.message}`)
      }
      return result.value
    }
    const statusFor = async (agentId?: string): Promise<TierStatus> =>
      unwrap<TierStatus>(await scope.remote.tier.status(agentId), 'status')
    const catalog: TierSettingsInjected['catalog'] = async () =>
      unwrap<TierCatalog>(await scope.remote.tier.catalog(), 'catalog')
    const setModeFor = async (mode: RoutingMode, agentId: string): Promise<TierStatus> => {
      if (agentId === '') throw new Error(t('noSession'))
      return unwrap<TierStatus>(await scope.remote.tier.setMode(mode, agentId), 'setMode')
    }
    // Read lazily: `sessions` is not a hard dependency of this client, so a
    // late-arriving service is picked up on the next call.
    const currentId = (): string | undefined => currentSessionId(scope.get('sessions'))

    slots.inject('conversation.input.left', () => slots.register({
      name: 'conversation.input.left',
      id: 'tier-pill',
      order: 30,
      locale: NS,
      inject: (sessionId: string | undefined): TierPillInjected => ({
        status: async () => statusFor(sessionId),
        setMode: async (mode: RoutingMode) => setModeFor(mode, sessionId ?? ''),
      }),
    }, TierPill))

    slots.inject('settings.plugins.tab', () => slots.register({
      name: 'settings.plugins.tab',
      id: 'autotier',
      order: 45,
      label: () => t('tab'),
      locale: NS,
      inject: (): TierSettingsInjected => ({
        status: async () => statusFor(currentId()),
        catalog,
        setMode: async (mode: RoutingMode) => setModeFor(mode, currentId() ?? ''),
      }),
    }, TierSettingsCard))
  })
}

/**
 * Read the session currently open in the shell from the sessions store face.
 * Structural on purpose: the store shape differs across harness lines, so only
 * the leaf is read, and an unknown shape degrades to `undefined` (the card then
 * shows the read-only view and disables the selector).
 */
function currentSessionId(sessions: unknown): string | undefined {
  try {
    const list = (sessions as { list?: unknown } | null | undefined)?.list
    if (typeof list !== 'object' || list === null) return undefined
    const getSnapshot = (list as { getSnapshot?: unknown }).getSnapshot
    if (typeof getSnapshot !== 'function') return undefined
    const current = (getSnapshot as () => { current?: unknown })().current
    return typeof current === 'string' ? current : undefined
  } catch {
    return undefined
  }
}
