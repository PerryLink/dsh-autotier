/**
 * Build faces for dsh-autotier. The node half (src/index.ts + the hand-written
 * Typert host manifest src/typert.host.ts) is the host Loader entry; the browser
 * half (src/client/index.ts) is the client bundle the client-modules node half
 * serves under /plugins/dsh-autotier/client.js.
 *
 * The browser half follows the shell's client-bundle handshake exactly: a CJS
 * bundle wrapped in `window.__ModuleLoader__.load({ id, factory })`, with the
 * shell's platform modules left external (the factory's `require` answers them
 * from the frozen module table) and every other dependency inlined. zod is
 * inlined into both halves; it stays a declared dependency because the strict
 * wire codecs are zod v4 schemas.
 *
 * `scripts/prepare.mjs` wipes lib/ up front and emits tsc declarations first,
 * so tsdown's clean stays off and the declarations survive the bundle step.
 */

import { defineConfig } from 'tsdown'

/** Plugin id: the cordis.yml bare row id, the graph row id, and the stamped bundle id must all match. */
const PLUGIN_ID = 'dsh-autotier'

/**
 * Module specifiers the shell shares into the frozen browser module table
 * (packages/client/web/src/platform.ts). Any value import outside this list
 * must be inlined.
 */
const PLATFORM_EXTERNALS: readonly string[] = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-schema-form',
]

export default defineConfig([
  {
    name: PLUGIN_ID,
    entry: { index: 'src/index.ts', 'typert.host': 'src/typert.host.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    dts: false,
    clean: false,
    // ESM output under a "type": "module" package must land on .js, not .mjs.
    fixedExtension: false,
    deps: {
      // Only zod may come in from node_modules; every @deepseek-ai/* face stays
      // external (peers) and node builtins are never bundled. Bundling zod keeps
      // the host half self-contained when a profile resolves the package outside
      // pnpm's tree.
      onlyBundle: ['zod'],
      alwaysBundle: ['zod'],
      neverBundle: [/^node:/, /^@deepseek-ai\//],
    },
  },
  {
    name: `${PLUGIN_ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: ['cjs'],
    platform: 'browser',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      // Platform modules stay external (the factory's `require` answers them
      // from the shell's frozen module table); every other import is inlined.
      // `onlyBundle: false` suppresses the bundled-dependency warning — the
      // inlining here is deliberate, not accidental.
      onlyBundle: false,
      alwaysBundle: (id: string) => (PLATFORM_EXTERNALS.includes(id) ? undefined : true),
      neverBundle: [...PLATFORM_EXTERNALS],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
