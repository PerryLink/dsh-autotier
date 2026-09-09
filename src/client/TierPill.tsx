/**
 * The composer tier pill: the session's effective routing mode with an
 * escalation badge. A click cycles the session override through
 * `auto -> strong -> cheap -> off` over `tier/setMode`; the host answers with
 * the refreshed snapshot, so the pill never shows an unconfirmed state.
 *
 * @module dsh-autotier/client/TierPill
 */

import { useEffect, useState, type ReactNode } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { RoutingMode } from '../types.ts'
import type { TierStatus } from '../wire.ts'
import { modeKey, nextMode, pillView } from './present.ts'

/** Registration-side injected face: the two Remote calls bound to this session. */
export interface TierPillInjected {
  /** Read this session's snapshot. */
  status: () => Promise<TierStatus>
  /** Pin or clear this session's routing mode. */
  setMode: (mode: RoutingMode) => Promise<TierStatus>
}

/** Full component props assembled by the composer tool-row renderer. */
export type TierPillProps =
  PropsRuntime<'conversation.input.left'>
  & PropsLocale<'settings.autotier'>
  & InjectFace<TierPillInjected>

/** The composer pill body. */
export function TierPill({ status, setMode, t }: TierPillProps): ReactNode {
  const [snapshot, setSnapshot] = useState<TierStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const next = await status()
        if (live) setSnapshot(next)
      } catch (error) {
        if (live) setFailure(error instanceof Error ? error.message : String(error))
      }
    })()
    return () => { live = false }
  }, [])

  const cycle = async (): Promise<void> => {
    if (snapshot === null || busy) return
    setBusy(true)
    setFailure(null)
    try {
      setSnapshot(await setMode(nextMode(snapshot.session.mode)))
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const view = snapshot === null ? null : pillView(snapshot)
  const label = view === null ? t('pillLoading') : t(modeKey(view.mode))
  const detail = view === null ? t('pillHint') : `${t('pillHint')} · ${view.detail}`
  return (
    <button
      type="button"
      className="datr-pill"
      data-dsh-autotier
      data-tone={view?.tone ?? 'auto'}
      data-escalated={view?.escalation === true ? '' : undefined}
      disabled={busy || snapshot === null}
      title={failure ?? detail}
      aria-label={`${t('pillHint')}: ${label}`}
      onClick={() => { void cycle() }}
    >
      <span className="datr-pill-label">{label}</span>
      {view?.escalation === true
        ? <span className="datr-pill-escalation" title={t('escalated')} aria-hidden="true">!</span>
        : null}
    </button>
  )
}
