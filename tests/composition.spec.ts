/**
 * Real Loader composition + built-artifact suite (community five-layer model,
 * layer 4). An independent process mounts the vendored Loader over a cordis.yml
 * with the real host service rows (session, system prompt, tools, commands,
 * llm, file-backed settings) plus the plugin row, proving module unwrapping,
 * inject resolution, and config schema application against the BUILT artifact.
 * @module dsh-autotier/tests/composition.spec
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runner = join(repositoryRoot, 'scripts', 'loader-runner.mjs')
const builtEntry = join(repositoryRoot, 'lib', 'index.js')
const temporaryRoot = mkdtempSync(join(tmpdir(), 'dsh-autotier-loader-'))

/**
 * One cordis.yml: the real host service rows, then the plugin row with config.
 * @param configLines - plugin config lines, already indented by the caller.
 * @param settingsPath - settings document path for the file provider.
 */
function configFor(configLines: string[] = [], settingsPath = join(temporaryRoot, 'settings.yaml')): string {
  return [
    "- name: '@deepseek-ai/dsh-session'",
    "- name: '@deepseek-ai/dsh-system-prompt'",
    "- name: '@deepseek-ai/dsh-tools'",
    "- name: '@deepseek-ai/dsh-commands'",
    "- name: '@deepseek-ai/dsh-llm'",
    "- name: '@deepseek-ai/dsh-settings-file'",
    '  config:',
    `    path: ${JSON.stringify(settingsPath)}`,
    '    watch: false',
    `- name: ${JSON.stringify(pathToFileURL(builtEntry).href)}`,
    ...(configLines.length > 0 ? ['  config:', ...configLines.map(line => `    ${line}`)] : []),
    '',
  ].join('\n')
}

function run(command: string, args: string[], cwd: string, shell = false, timeout = 120_000) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env },
    timeout,
    shell,
  })
  if (result.error !== undefined) throw result.error
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

beforeAll(() => {
  const build = run('pnpm', ['run', 'build'], repositoryRoot, process.platform === 'win32')
  if (build.status !== 0) {
    throw new Error(`pnpm run build failed (${String(build.status)})\nstdout:\n${build.stdout}\nstderr:\n${build.stderr}`)
  }
}, 240_000)

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true })
})

describe('real Loader composition', () => {
  it('mounts the autotier service and applies the routing mode through the Loader', () => {
    const configPath = join(temporaryRoot, 'valid.yml')
    writeFileSync(configPath, configFor(['routingMode: cheap']))
    const evidence = run(process.execPath, [runner, configPath], repositoryRoot)
    expect(evidence.status, `stdout:\n${evidence.stdout}\nstderr:\n${evidence.stderr}`).toBe(0)
    expect(evidence.stdout).toMatch(/DSH_LOADER_RESULT/u)
    const marker = evidence.stdout.match(/DSH_LOADER_RESULT (.+)$/mu)
    const result = JSON.parse(marker![1]!) as { mode: string; strong: string; cheap: string }
    expect(result.mode).toBe('cheap')
    expect(result.strong).toBe('deepseek-v4-pro')
    expect(result.cheap).toBe('deepseek-v4-flash')
  })

  it('rejects an effort outside the adapter vocabulary through the Loader schema', () => {
    const configPath = join(temporaryRoot, 'invalid-effort.yml')
    writeFileSync(configPath, configFor([
      'tiers:',
      '  strong:',
      '    effort: medium',
    ]))
    const evidence = run(process.execPath, [runner, configPath], repositoryRoot)
    expect(evidence.status, `invalid config unexpectedly mounted:\n${evidence.stderr}`).not.toBe(0)
  })

  it('rejects a strong/cheap collision through the cross-field judge', () => {
    const configPath = join(temporaryRoot, 'invalid-collision.yml')
    writeFileSync(configPath, configFor([
      'tiers:',
      '  cheap:',
      '    provider: deepseek-official',
      '    model: deepseek-v4-pro',
      '    effort: high',
    ]))
    const evidence = run(process.execPath, [runner, configPath], repositoryRoot)
    expect(evidence.status, `invalid config unexpectedly mounted:\n${evidence.stderr}`).not.toBe(0)
  })
})
