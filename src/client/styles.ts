/**
 * Scoped stylesheet for the autotier client surfaces. Standalone client bundles
 * cannot use the in-repo CSS-module pipeline, so the sheet ships as a string and
 * is installed effect-scoped into a `<style data-dsh-autotier>` element. Every
 * selector is scoped under `[data-dsh-autotier]` and uses theme design tokens
 * only, so it follows both color schemes.
 *
 * @module dsh-autotier/client/styles
 */

/** One `<style>` installation; returns the exact disposer that removes it. */
export function installAutotierStyles(): () => void {
  const existing = document.querySelector('style[data-dsh-autotier]')
  if (existing !== null) return () => {}
  const element = document.createElement('style')
  element.dataset.dshAutotier = ''
  element.textContent = AUTOTIER_CSS
  document.head.append(element)
  return () => { element.remove() }
}

/** The autotier stylesheet, scoped and token-driven. */
const AUTOTIER_CSS = `
[data-dsh-autotier].datr-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  font-size: 0.85em;
  line-height: 1.4;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
}
[data-dsh-autotier].datr-pill:disabled {
  cursor: default;
  opacity: 0.6;
}
[data-dsh-autotier].datr-pill[data-tone='strong'] {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-brand-primary);
}
[data-dsh-autotier].datr-pill[data-tone='cheap'] {
  border-color: var(--dsw-alias-state-warn-primary);
  color: var(--dsw-alias-state-warn-primary);
}
[data-dsh-autotier].datr-pill[data-tone='off'] {
  color: var(--dsw-alias-label-secondary);
}
[data-dsh-autotier] .datr-pill-label {
  font-weight: 600;
  letter-spacing: 0.02em;
}
[data-dsh-autotier] .datr-pill-escalation {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: 0.75em;
  font-weight: 700;
  color: var(--dsw-alias-bg-layer-1);
  background: var(--dsw-alias-state-error-primary);
}
[data-dsh-autotier] .datr-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
[data-dsh-autotier] .datr-heading {
  margin: 4px 0 0;
  font-size: 1em;
  color: var(--dsw-alias-label-primary);
}
[data-dsh-autotier] .datr-status {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
}
[data-dsh-autotier] .datr-failure {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
[data-dsh-autotier] .datr-failure button,
[data-dsh-autotier] .datr-action {
  font: inherit;
  cursor: pointer;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 4px;
  padding: 4px 10px;
}
[data-dsh-autotier] .datr-failure-detail {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
}
[data-dsh-autotier] .datr-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  padding: 12px;
}
[data-dsh-autotier] .datr-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9em;
  color: var(--dsw-alias-label-secondary);
}
[data-dsh-autotier] .datr-field select {
  font: inherit;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 4px;
  padding: 4px 8px;
  max-width: 320px;
}
[data-dsh-autotier] .datr-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
}
[data-dsh-autotier] .datr-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
[data-dsh-autotier] .datr-row-title {
  color: var(--dsw-alias-label-primary);
  min-width: 88px;
}
[data-dsh-autotier] .datr-row-value {
  color: var(--dsw-alias-label-secondary);
  font-size: 0.9em;
  overflow-wrap: anywhere;
}
[data-dsh-autotier] .datr-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.8em;
  white-space: nowrap;
  border: 1px solid currentColor;
  color: var(--dsw-alias-state-error-primary);
}
[data-dsh-autotier] .datr-notice {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 0.9em;
  overflow-wrap: anywhere;
}
[data-dsh-autotier] .datr-meta {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 0.85em;
  overflow-wrap: anywhere;
}
`
