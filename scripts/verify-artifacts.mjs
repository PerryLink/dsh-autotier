// Verify the built artifacts after `pnpm run build`: syntax-check the host
// bundle, import it under plain Node, assert the shipped files, check the
// Typert host manifest shape, and confirm the browser bundle keeps the shell's
// platform modules external. Guards against TypeScript-only syntax leaking into
// shipped output, a tarball missing a declared face, and a client bundle that
// inlined a platform module.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const required = [
  'lib/index.js',
  'lib/typert.host.js',
  'lib/client.js',
  'lib/types/index.d.ts',
  'lib/types/config.d.ts',
  'lib/types/typert.host.d.ts',
  'lib/types/client/index.d.ts',
  'cordis.patch.yml',
]
for (const rel of required) {
  if (!existsSync(path.join(root, rel))) throw new Error(`missing artifact: ${rel}`)
}

// 1. Syntax-check the host bundle (plain Node parse; no execution).
execFileSync(process.execPath, ['--check', path.join(root, 'lib/index.js')], { stdio: 'inherit' })

// 2. The ESM host face must import under plain Node (no tsx, no checkout paths).
const index = await import(pathToFileURL(path.join(root, 'lib/index.js')).href)
if (typeof index.apply !== 'function' || index.name !== 'dsh-autotier') {
  throw new Error('lib/index.js exports an unexpected plugin face')
}
if (!Array.isArray(index.inject) || !index.inject.includes('sessions')) {
  throw new Error('lib/index.js must declare the sessions service in inject')
}
if (typeof index.Config !== 'function' || typeof index.Config.toJSON !== 'function') {
  throw new Error('lib/index.js must export the Schemastery Config schema')
}
if (typeof index.TierRemoteService !== 'function' || !Array.isArray(index.TIER_INVOCATIONS) || index.TIER_INVOCATIONS.length !== 3) {
  throw new Error('lib/index.js must export the tier Remote service and its three invocations')
}

// 3. The shipped declaration face must not reference checkout-only paths.
const declaration = readFileSync(path.join(root, 'lib/types/index.d.ts'), 'utf8')
if (declaration.includes('deepseek-harness')) {
  throw new Error('lib/types/index.d.ts leaked a checkout path')
}

// 4. The Typert host manifest must carry the three tier invocations, each with
//    a strict zod v4 codec (the loader rejects anything else).
const typert = await import(pathToFileURL(path.join(root, 'lib/typert.host.js')).href)
const manifest = typert.TYPERT
if (manifest?.package !== 'dsh-autotier' || manifest?.face !== 'host') {
  throw new Error('lib/typert.host.js exports an unexpected TYPERT manifest')
}
if (!Array.isArray(manifest.invocations) || manifest.invocations.length !== 3) {
  throw new Error('lib/typert.host.js must carry the three tier invocations')
}
for (const invocation of manifest.invocations) {
  if (invocation.service !== 'tier' || invocation.namespace !== 'tier' || typeof invocation.method !== 'string') {
    throw new Error(`lib/typert.host.js invocation ${String(invocation.id)} is not a tier method`)
  }
  if (invocation.result?.mode !== 'strict' || !('_zod' in (invocation.result.schema ?? {}))) {
    throw new Error(`lib/typert.host.js invocation ${String(invocation.id)} has no zod v4 result codec`)
  }
}

// 5. The browser bundle must keep the shell's platform modules external: the
//    ModuleLoader handshake wraps a CJS factory whose `require` answers them
//    from the frozen module table.
const client = readFileSync(path.join(root, 'lib/client.js'), 'utf8')
const head = client.split('\n').map(line => line.trim()).filter(line => line !== '')
if (head[0] !== 'window.__ModuleLoader__.load({' || !head[1]?.startsWith('id: "dsh-autotier"') || head[2] !== 'factory: (require) => {') {
  throw new Error('lib/client.js does not open with the ModuleLoader handshake for dsh-autotier')
}
const tail = client.split('\n').map(line => line.trim())
  .filter(line => line !== '' && !line.startsWith('//# sourceMappingURL'))
if (!client.includes('return module.exports;') || tail.at(-1) !== '});') {
  throw new Error('lib/client.js does not close the ModuleLoader handshake')
}
for (const spec of ['react', 'react/jsx-runtime']) {
  if (!client.includes(`require("${spec}")`)) {
    throw new Error(`lib/client.js must require the platform module ${spec} instead of inlining it`)
  }
}

console.log('artifacts OK: syntax + ESM import + typert manifest + external platform modules + shipped faces present')
