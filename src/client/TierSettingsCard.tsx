/**
 * The autotier Settings card (Plugins section): the session routing-mode
 * selector, the read-only tier landings, the live session state, and the model
 * catalog dropdown fed by `tier/catalog`.
 *
 * The selector writes the *session* override for the session currently open in
 * the shell (resolved by the client entry through the sessions store face), so
 * it stays non-persistent exactly like the pill and `/tier`. When no session is
 * open the host answers with an empty session view and the selector is disabled
 * with an explanation instead of failing silently.
 *
 * @module dsh-autotier/client/TierSettingsCard
 */

import { useEffect, useState, type ReactNode } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { ROUTING_MODES, type RoutingMode } from '../types.ts'
import type { TierCatalog, TierStatus } from '../wire.ts'
import { catalogEntries, landings, landingText, modalityText, modeKey, statusDetail, tierKey } from './present.ts'

/** Registration-side injected face: the three Remote calls bound to this card. */
export interface TierSettingsInjected {
  /** Read the current session's snapshot. */
  status: () => Promise<TierStatus>
  /** Read the live provider/model catalog. */
  catalog: () => Promise<TierCatalog>
  /** Pin or clear the current session's routing mode. */
  setMode: (mode: RoutingMode) => Promise<TierStatus>
}

/** Full component props assembled by the Plugins-tab renderer. */
export type TierSettingsCardProps =
  PropsRuntime<'settings.plugins.tab'>
  & PropsLocale<'settings.autotier'>
  & InjectFace<TierSettingsInjected>

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly snapshot: TierStatus; readonly catalog: TierCatalog }

/** The Settings card body. */
export function TierSettingsCard({ status, catalog, setMode, t }: TierSettingsCardProps): ReactNode {
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const load = async (): Promise<void> => {
    try {
      const [snapshot, providers] = await Promise.all([status(), catalog()])
      setState({ status: 'ready', snapshot, catalog: providers })
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const chooseMode = async (mode: RoutingMode): Promise<void> => {
    setBusy(true)
    setFailure(null)
    try {
      const snapshot = await setMode(mode)
      setState(current => (current.status === 'ready' ? { ...current, snapshot } : current))
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  if (state.status === 'loading') return <p className="datr-status" data-dsh-autotier>{t('loading')}</p>
  if (state.status === 'error') {
    return (
      <div className="datr-failure" data-dsh-autotier>
        <p className="datr-failure-detail">{t('error')} {state.message}</p>
        <button type="button" onClick={() => { setState({ status: 'loading' }); void load() }}>{t('retry')}</button>
      </div>
    )
  }

  const { snapshot, catalog: providers } = state
  const entries = catalogEntries(providers)
  const current = entries.find(entry => entry.value === selected)
  const bound = snapshot.session.agentId !== null
  return (
    <div className="datr-section" data-dsh-autotier>
      <div className="datr-panel">
        <label className="datr-field">
          <span>{t('mode')}</span>
          <select
            value={snapshot.session.mode}
            disabled={busy || !bound}
            onChange={(event) => { void chooseMode(event.target.value as RoutingMode) }}
          >
            {ROUTING_MODES.map(mode => <option key={mode} value={mode}>{t(modeKey(mode))}</option>)}
          </select>
        </label>
        <p className="datr-notice">{t('modeHint')}</p>
        {bound ? null : <p className="datr-notice">{t('noSession')}</p>}
        {failure === null ? null : <p className="datr-notice">{failure}</p>}
      </div>

      <div className="datr-rows">
        <h3 className="datr-heading">{t('landings')}</h3>
        {landings(snapshot).map(entry => (
          <div className="datr-row" key={entry.tier}>
            <span className="datr-row-title">
              {entry.tier === 'vision' ? t('tierVision') : t(tierKey(entry.tier))}
            </span>
            <span className="datr-row-value">{landingText(entry.route)}</span>
            {entry.route.effort === undefined
              ? <span className="datr-row-value">{t('followsSession')}</span>
              : <span className="datr-row-value">{`${t('effort')}: ${entry.route.effort}`}</span>}
          </div>
        ))}
      </div>

      <div className="datr-rows">
        <h3 className="datr-heading">{t('session')}</h3>
        <div className="datr-row">
          <span className="datr-row-title">{t('sessionOverride')}</span>
          <span className="datr-row-value">
            {snapshot.session.override === null ? t('sessionFollow') : t(modeKey(snapshot.session.override))}
          </span>
          {snapshot.session.escalation ? <span className="datr-badge">{t('escalationActive')}</span> : null}
        </div>
        <div className="datr-row">
          <span className="datr-row-title">{t('appliedTier')}</span>
          <span className="datr-row-value">
            {snapshot.session.appliedTier === null
              ? t('appliedNone')
              : `${snapshot.session.appliedTier}${snapshot.session.appliedSource === null ? '' : ` (${snapshot.session.appliedSource})`}`}
          </span>
          {snapshot.session.plan ? <span className="datr-badge">{t('planActive')}</span> : null}
        </div>
        <div className="datr-row">
          <span className="datr-row-title">{t('denials')}</span>
          <span className="datr-row-value">{snapshot.session.denials}</span>
        </div>
        <p className="datr-meta">{statusDetail(snapshot)}</p>
      </div>

      <div className="datr-panel">
        <h3 className="datr-heading">{t('catalog')}</h3>
        <label className="datr-field">
          <span>{t('catalogSelect')}</span>
          <select value={selected} onChange={(event) => { setSelected(event.target.value) }}>
            <option value="">{t('catalogSelect')}</option>
            {providers.map(provider => (
              <optgroup key={provider.provider} label={provider.provider}>
                {provider.models.map(model => (
                  <option key={`${provider.provider}/${model.id}`} value={`${provider.provider}/${model.id}`}>
                    {`${model.name} (${model.id})`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <p className="datr-notice">{t('catalogHint')}</p>
        {current === undefined ? null : (
          <p className="datr-meta">
            {`${t('provider')}: ${current.provider} · ${t('model')}: ${current.model.id} · ${t('modalities')}: ${modalityText(current.model)}`}
          </p>
        )}
      </div>

      <button type="button" className="datr-action" disabled={busy} onClick={() => { void load() }}>{t('refresh')}</button>
    </div>
  )
}
