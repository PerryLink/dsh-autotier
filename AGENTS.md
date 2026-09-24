# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-autotier`). Development
follows the dsh-plugin-guide skill and the official plugin contract; this file
records repo-local decisions.

## Layout

- `src/index.ts` — function-plugin contract (`name`/`inject`/`Config`/`apply`; NO
  default export). Injects `settings`, `llm`, `tools`, `commands` and `sessions`
  (plural — the host service is `ctx.sessions`); `agents`, `planMode`,
  `sessionProjections` and `sandboxPolicy` are read with `ctx.get()` and degrade
  when absent.
- `src/schema.ts` — the Schemastery schema and the raw (partial) config
  interfaces it resolves, plus the `VolatileConfig` face the Loader hands
  `apply`. Kept free of executable logic so a schema module never mixes function
  values into its declarations (the plugin-doctor K4 rule).
- `src/config.ts` — the explicit `resolveConfig` judge (no hidden `?? default`
  in callers) and the resolved interfaces. It accepts BOTH config faces (plain
  data and the Loader's `Volatile` references) and is the plugin's only
  cross-field judge: Schemastery cannot express those rules and is all the Host
  validates a form write against, so mount and every live update route through
  here. Object defaults are COMPLETE objects; the adapter-owned effort
  vocabulary is `off | low | high | max` (there is no `medium`).
- `src/service.ts` — `ctx.autotier` (`status()` and `reconfigure()`, which the
  settings binding calls to swap the live policy).
- `src/settings.ts` — the host settings seam: claims the instance's Plugins-page
  policy (`ctx.settings.configure({ auto: false })`) and re-resolves the routing
  policy on every `loader/volatile-update`.
- `src/types.ts` — shared vocabulary (tier ids, effort ids, routing modes,
  scenarios, route/status shapes).
- `src/wire.ts` — the `tier` Remote wire vocabulary: `TierStatus` (the public
  `AutotierStatus` plus an additive `session` view), `TierCatalog`, their zod v4
  codecs, and the three invocation descriptors shared verbatim by the host
  manifest and the client contribution.
- `src/typert.host.ts` — the hand-written host Typert manifest exported as
  `./typert`; the harness's typert-loader registers the `tier` invocations from
  it when the plugin mounts.
- `src/tier-remote.ts` — `TierRemoteService` (`TypertRemoteService`, namespace
  `tier`): `status(agentId?)` / `catalog()` / `setMode(mode, agentId?)`. The
  override it writes is the same per-agent `RouteState.override` the router and
  `/tier` read; `agents` is read optionally through the injected resolver.
- `src/client/` — browser half: `$mount`s the Remote contribution, registers the
  composer pill into `conversation.input.left` (id `tier-pill`) and the Settings
  card into `plugins.item` (id `autotier`), with a pure presenter
  (`present.ts`), inline scoped stylesheet (`styles.ts`), and en/zh dictionaries
  (`locales.ts`). The slot registry is read through a local structural
  `SlotsFace` (its owning package differs across host lines). The browser half
  needs no `configForms` entry: the Host generates the config form for the
  `autotier` row from its `Config` schema, and this card is the dedicated
  runtime surface (routing mode, live landings, catalog).
- `tests/` — vitest over the REAL published `0.1.7-rc.2` host packages
  (`Context`, `SessionStore`, `SystemPrompt`, `ToolRuntime`, `CommandRuntime`)
  plus one real Loader composition. The `settings` service is the one stand-in:
  the host's real `SettingsForms` binds to `configEditor`, `profileContext` and
  the Loader's fiber graph, none of which this plugin consumes, while the
  plugin's contract with it is only `configure({ auto })` and
  `loader/volatile-update`. The browser half is covered through its pure units
  (wire codecs, presenter, dictionaries) and the `tier` service through a real
  mount with a scripted `agents` face.

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
- **Fail loud**: invalid configuration throws at mount, and a live update the
  cross-field judge refuses keeps the last good policy and logs — configuration
  never silently disables routing.
- **One cross-field judge**: Schemastery cannot express this plugin's cross-field
  rules and is all the Host validates a settings-form write against, so
  `resolveConfig` is the only judge and both paths (mount, live update) call it.
  `.volatile()` sits on each top-level Config section — never inside an array,
  dict or union, which Schemastery forbids — and `routingMode` stays plain
  because the per-session override is its runtime switch.
- **Model-visible ⟺ logged**: the only model-visible content is the `/tier`
  output and the guard's corrective denial. The judge's own model call carries a
  producer-owned source kind (`dsh-autotier`, declared by module augmentation in
  `src/judge.ts`); there is no shared `kind: 'plugin'` catch-all, and the session
  format's row admission rejects that retired wrapper. No custom session event is
  appended (that vocabulary is fail-closed on `0.1.2-alpha.1` and later); the
  trail is the plugin logger plus the live `autotier/tier-changed` bus event, and
  the sole append is the `plan/mode` fallback when the plan-mode service is
  absent.
- **Registration is an effect**: every listener, command, tool, service and
  page-policy claim rides the plugin fiber and disappears on dispose. (There is
  no settings namespace to release any more: the Host owns the form.)

## Config

Schema in `src/schema.ts` (judged by `src/config.ts`); `cordis.patch.yml`
documents the same keys inline; the five-language READMEs carry the user-facing
table.
`package.json#dshWorkshop` is the omdsh-workshop-package/v1 intake manifest
(declarations only — evidence paths stay null until their adapter runs).

## Build

`typescript` + `tsdown` are regular `dependencies` (the git channel's `prepare`
builds with production dependencies alone). `scripts/prepare.mjs` wipes `lib/`,
emits tsc declarations into `lib/types`, then runs tsdown (tsdown `clean` stays
OFF so the declarations survive). Two build faces: the node half
(`lib/index.js` + `lib/typert.host.js`) and the browser half (`lib/client.js`),
whose CJS factory is wrapped in `window.__ModuleLoader__.load({ id, factory })`
with the shell's platform modules (`react`, `react/jsx-runtime`, the
`@deepseek-ai/dsh-client-*` singletons) left external and zod inlined.
`pnpm-workspace.yaml` declares `allowBuilds: { esbuild: true }`.

## Checks

`pnpm run typecheck && pnpm run typecheck:ci && pnpm test && pnpm run build &&
pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm pack`. The
plain `typecheck` resolves the local harness checkout's type faces through
tsconfig `paths` (four levels up to `D:\deepseek-harness`); `typecheck:ci`
resolves the npm-published `0.1.7-rc.2` faces (no paths) and is what CI runs —
keep both green. Both rulers must be on the SAME host line: this plugin's
settings seam exists only from `0.1.6-alpha.2` on, so a green checkout ruler with
a stale published pin would prove nothing.

## Release

`node scripts/release.mjs <x.y.z>` bumps `package.json`, stamps the CHANGELOG
`[Unreleased]` section, re-runs the gate, commits, and tags `v<x.y.z>` locally —
never pushes. Push with `git push origin main --follow-tags`; the release
workflow then gates again, publishes npm with provenance (secret `NPM_TOKEN`),
and creates the GitHub Release from the CHANGELOG section.

## Docs

- Five-language READMEs (`README.md`, `README-zh.md`, `README-es.md`,
  `README-pt.md`, `README-hi.md`) — keep all five in sync; the English file is
  the source of truth.
- GitHub topics mirror `package.json` keywords.
- `THIRD_PARTY_NOTICES.md` records the MIT-licensed guard-rule port from
  `dsh-tier-router`.
