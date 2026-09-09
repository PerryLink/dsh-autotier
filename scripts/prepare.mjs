// Self-contained build used by both `pnpm run build` and the git-install
// `prepare` lifecycle: emits lib/types (tsc declarations) and lib/*.js
// (tsdown bundles). Uses ONLY the build tools declared in `dependencies`
// because pnpm does not install devDependencies of git-hosted packages.
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

function binOf(packageName, binKey) {
  const pkgPath = require.resolve(`${packageName}/package.json`)
  const pkg = require(pkgPath)
  const bin = pkg.bin
  const entry = typeof bin === 'string' ? bin : bin?.[binKey]
  if (entry === undefined) throw new Error(`${packageName} declares no "${binKey}" bin`)
  return path.resolve(path.dirname(pkgPath), entry)
}

// Every child's stdout is routed to our stderr: this script runs inside
// `npm pack`/`npm publish`, whose own `--json` output must stay the only thing
// on stdout (a JSON consumer such as dsh-plugin-doctor parses it).
function run(bin, args) {
  const result = spawnSync(process.execPath, [bin, ...args], { stdio: ['ignore', 2, 2] })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// Remove the previous lib/ output so a rebuild never mixes stale artifacts.
rmSync(new URL('../lib', import.meta.url), { recursive: true, force: true })

run(binOf('typescript', 'tsc'), ['-p', 'tsconfig.build.json'])
run(binOf('tsdown', 'tsdown'), [])
// TS 5.9 does not rewrite `.ts` specifiers in declaration emit; fix them so
// NodeNext declaration consumers can resolve lib/types.
run(path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fix-dts.mjs'), [])
console.error('build complete: lib/types + lib/index.js')
