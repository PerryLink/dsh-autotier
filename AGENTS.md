# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-autotier`). Development
follows the dsh-plugin-guide skill and the official plugin contract; this file
records repo-local decisions.

## Layout

- `src/index.ts` — function-plugin contract (`name`/`inject`/`Config`/`apply`; NO
  default export). Injects `settings`, `llm`, `tools`, `commands` and `sessions`
  (plural — the host service is `ctx.sessions`); `agents`, `subagents`,
  `systemPrompt`, `planMode`, `sessionProjections` and `sandboxPolicy` are read
  with `ctx.get()` and degrade when absent.
- `src/config.ts` — Schemastery schema + the explicit `resolveConfig` judge (no
  hidden `?? default` in callers). Object defaults are COMPLETE objects; the
  adapter-owned effort vocabulary is `off | low | high | max` (there is no
  `medium`).
- `src/service.ts` — `ctx.autotier` (`status()` and the live settings scope).
- `src/types.ts` — shared vocabulary (tier ids, effort ids, routing modes,
  scenarios, route/status shapes).
- `tests/` — vitest over the REAL published `0.1.2-rc.1` host packages
  (`Context`, `SessionStore`, `SystemPrompt`, `ToolRuntime`, `CommandRuntime`,
  in-memory `SettingsProvider`) plus one real Loader composition.

## Hard rules applied here

- **Tier landing seam**: `agent/request` waterfall, registered at load time on
  the root scope with `{ prepend: true }`; always `await next()` exactly once and
  return a replacement `LlmCallConfig` (provider/model/effort), preserving the
  sampling scalars (`temperature`, `maxTokens`, `stop`) the session already
  chose. Never return `undefined` from the listener.
- **`inject` names are verified against the checkout**, not guessed: `sessions`
  (plural), `tools`, `commands`, `llm`, `settings`. A wrong name leaves the
  plugin PENDING forever.
- **No `agent.options` mutation**: agent options are readonly and read cyclically
  by the loop; the request waterfall is the only supported landing.
- **Guard is defence in depth**: it never weakens `dsh-defend`, the approval
  service or the sandbox policy. A guard that throws escalates the call instead
  of allowing it.
- **Fail loud**: invalid configuration throws at mount or at the settings write,
  never silently disables routing.
- **Model-visible ⟺ logged**: the only model-visible content is the `/tier`
  output and the guard's corrective denial; both are reconstructable from the
  plugin logger and the `autotier/tier-changed` event on harness lines whose
  session-event vocabulary is fail-closed.
- **Registration is an effect**: every listener, command, tool, service and
  settings namespace rides the plugin fiber and disappears on dispose.

## Config

Schema in `src/config.ts`; `cordis.patch.yml` documents the same keys inline;
the five-language READMEs carry the user-facing table.
`package.json#dshWorkshop` is the omdsh-workshop-package/v1 intake manifest
(declarations only — evidence paths stay null until their adapter runs).

## Build

`typescript` + `tsdown` are regular `dependencies` (the git channel's `prepare`
builds with production dependencies alone). `scripts/prepare.mjs` wipes `lib/`,
emits tsc declarations into `lib/types`, then runs tsdown (tsdown `clean` stays
OFF so the declarations survive). `pnpm-workspace.yaml` declares
`allowBuilds: { esbuild: true }`.

## Checks

`pnpm run typecheck && pnpm run typecheck:ci && pnpm test && pnpm run build &&
pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm pack`. The
plain `typecheck` resolves the local harness checkout's type faces through
tsconfig `paths` (four levels up to `D:\deepseek-harness`); `typecheck:ci`
resolves the npm-published `0.1.2-rc.1` faces (no paths) and is what CI runs —
keep both green.

## Release

`node scripts/release.mjs <x.y.z>` bumps `package.json`, stamps the CHANGELOG
`[Unreleased]` section, re-runs the gate, commits, and tags `v<x.y.z>` locally —
never pushes. Push with `git push origin main --follow-tags`; the release
workflow then gates again, publishes npm with provenance (secret `NPM_TOKEN`),
and creates the GitHub Release from the CHANGELOG section.

## Docs

- Five-language READMEs (`README.md`, `README.zh.md`, `README.es.md`,
  `README.pt.md`, `README.hi.md`) — keep all five in sync; the English file is
  the source of truth.
- GitHub topics mirror `package.json` keywords.
- `THIRD_PARTY_NOTICES.md` records the MIT-licensed guard-rule port from
  `dsh-tier-router`.
