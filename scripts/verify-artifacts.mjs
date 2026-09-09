// Verify the built artifacts after `pnpm run build`: syntax-check the host
// bundle, import it under plain Node, and assert the shipped files. Guards
// against TypeScript-only syntax leaking into shipped output and against a
// tarball missing a declared face.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const required = [
  'lib/index.js',
  'lib/types/index.d.ts',
  'lib/types/config.d.ts',
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

// 3. The shipped declaration face must not reference checkout-only paths.
const declaration = await import('node:fs').then(fs => fs.readFileSync(path.join(root, 'lib/types/index.d.ts'), 'utf8'))
if (declaration.includes('deepseek-harness')) {
  throw new Error('lib/types/index.d.ts leaked a checkout path')
}

console.log('artifacts OK: syntax + ESM import + inject/Config faces + clean declarations')
