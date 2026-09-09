/**
 * Host build face for dsh-autotier. The plugin is host-plane only: routing
 * decisions, the settings namespace, the `/tier` command, the guard waterfall
 * and the status tools all live in the node half. A browser half (Settings
 * card + composer tier pill) is added in the UI milestone.
 *
 * `scripts/prepare.mjs` wipes lib/ up front and emits tsc declarations first,
 * so tsdown's clean stays off and the declarations survive the bundle step.
 */

import { defineConfig } from 'tsdown'

/** Plugin id: the cordis.yml bare row id, the graph row id, and the bundle id must all match. */
const PLUGIN_ID = 'dsh-autotier'

export default defineConfig({
  name: PLUGIN_ID,
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  dts: false,
  clean: false,
  // ESM output under a "type": "module" package must land on .js, not .mjs.
  fixedExtension: false,
  deps: {
    // Every @deepseek-ai/* face stays external (peers) and node builtins are
    // never bundled; the host half has no runtime dependency of its own.
    neverBundle: [/^node:/, /^@deepseek-ai\//],
  },
})
