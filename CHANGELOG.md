# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Re-verified against the `0.1.7-alpha.2` host; the `@deepseek-ai/dsh-*` host pins move to `0.1.7-alpha.2`.** The `alpha.2` wave removes nothing this plugin consumes: the published type surface of every host package it resolves is either byte-identical to `0.1.7-alpha.1` (`@deepseek-ai/cordis` `4.0.3`≡`4.0.4`, `@deepseek-ai/schemastery` `3.18.3`≡`3.18.4`) or strictly additive (`ToolDefinition.projectContent?`, `ClientModuleLoader.importError()`, six added `dsh-client-locale` keys). The wave's only removals are internals no plugin in this family references — `dsh-subprocess-local` privates and its non-entry `bindManagedProcess`, `dsh-client-web` `assertEntriesActive`, `dsh-app-boot`'s `unhandledRejection` event, `dsh-client-ui-plugin-manager` `apply()`, a refined `dsh-client-ui-primitives` `CodeBlock` signature, and the `diff.files.one`/`diff.files.other` locale key pair. Both rulers therefore stay green on the moved pin: `typecheck` against the checkout, `typecheck:ci` against the published `0.1.7-alpha.2` faces.
- The declared host range is deliberately **unchanged**. It already admits `0.1.7-alpha.2` (`0.1.7-alpha.2` satisfies the `>=0.1.7-0 <0.2.0` clause), and the family convention keeps peer ranges wider than the verified line rather than narrowing them to it; a range is what the manifest accepts, not what has been tested.
- Repo documentation (`AGENTS.md`), the workspace graph pin (`pnpm-workspace.yaml`) and the published-line workflow pins move with the manifest, so no file still claims the previous line.


## [0.2.5] - 2026-09-22

### Changed

- **Adapted to the `0.1.7-alpha.1` host. This is a breaking adaptation: the older lines are dropped.** The `0.1.6`-generation harness replaced the settings *provider* seam with `SettingsForms`, so `ctx.settings.register(ns, schema, { base, validate })` and the `settings/updated` event no longer exist on any published line that ships the new service. Configuration is now read from the row's own volatile references: each top-level `Config` section is declared `.volatile()`, the plugin claims its Plugins-page policy with `ctx.settings.configure({ auto: false })`, and a live edit re-resolves the routing policy on `loader/volatile-update`. `.volatile()` cannot sit inside an array, dict or union, so it is applied per top-level section rather than per nested field. `routingMode` stays plain on purpose: it is the composition default, and the runtime switch remains the per-session override written by `/tier`, the composer pill and the card. Cross-field validation is unchanged in kind but moved owner: `.check()` does not exist in the pinned Schemastery, so `resolveConfig` — still the single judge at mount — now also runs on every live update and keeps the last good policy when it refuses a value.
- The `@deepseek-ai/dsh-settings-file` test dependency is gone (the package was deleted upstream); the composition suite provides the `settings` service through the Loader runner instead, since the real `SettingsForms` injects `configEditor` and `profileContext` from the launcher.
- External-change detection in `SelectionSync` is now a re-read comparison rather than a subscription. `settings/updated` is gone, so `observeExternalSelection()` reads `agentDefaultModel.currentSelection()` and delegates every live session when it differs from the value this plugin last wrote. It runs immediately before a tier is mirrored, so a user's model pick is still never overwritten by a routing decision; before this plugin's first write nothing is delegated, because at that point "not ours" describes the composition default rather than an override.
- The `@deepseek-ai/dsh-*` dev/test pins are unified onto the published `0.1.7-alpha.1` line (the frozen `0.1.5-rc.3` line still carries the removed `SettingsProvider` contract, so it cannot type-check this plugin's settings seam). This also settles the previous mixed line, where most pins sat on `0.1.5-rc.2` and two on `0.1.6-alpha.2`. `@deepseek-ai/cordis` moves to `^4.0.3` (4.0.2 does not export `Volatile`), `@deepseek-ai/schemastery` to `^3.18.3` (3.18.2 has neither `.volatile()` nor `Volatile<`), and `@deepseek-ai/cosmokit ^1.8.4` is added as a peer/dev dependency for `Volatile`/`isVolatile`; `@deepseek-ai/cordis-plugin-loader` moves to `^1.0.4`, which is the first version declaring `loader/volatile-update`.
- The declared host range gains the `0.1.7` line (`>=0.1.7-0 <0.2.0`). This is a correctness fix, not a widening: a semver range whose only prerelease comparator sits on an earlier version tuple does not admit a later alpha, so `engines.dsh` and every peer range previously excluded the very host this release targets.
- The strict Typert codecs are single-face. The protocol declares exactly `create(): TypertSchema`, the typert-loader enforces it, and nothing reads the `schema` property the codec used to carry alongside it — so the dual-face shape was dead weight that still looked supported. `scripts/verify-artifacts.mjs` now asserts `create()` is present and `schema` is absent.

### Fixed

- The judge's model call no longer uses the removed `kind: 'plugin'` message-source catch-all. `MessageSourceMap` is a merge-extensible sum type with no shared plugin kind, and the session format's physical-row admission rejects `kind === 'plugin'` outright. The call now declares its own `dsh-autotier` kind by module augmentation in `src/judge.ts`, with a bounded `notice` summary so the durable log says why an extra model call happened (`tool-jobs` is the upstream precedent).
- The integration suite runs on the new host contract: the in-memory `SettingsProvider` subclasses are replaced by a real cordis `Service` stand-in that implements `configure`, the settings-namespace assertions become live-update assertions, `settings/updated` emissions become re-read comparisons, and the duplicate-service remount assertion tracks cordis 4.0.3's wording.

### Removed

- The `validateConfig` save-time hook. It is no longer wired to anything (the Host has no validate hook to attach it to) and remains exported only as a deprecated alias of `resolveConfig` for existing importers.

## [0.2.3] - 2026-09-12

### Changed

- The default cheap and vision tiers now land on `deepseek-flash` (the 0.1.6 catalogue id, image-capable) instead of the removed `deepseek-v4-flash*` ids — a behavior change: image turns no longer fail with `UNSUPPORTED_CONTENT` on hosts with the new catalogue, and the vision tier is genuinely multimodal again.
- The mount now fails loudly when a default tier model id is missing from a new-generation host catalogue (a missing id used to degrade silently to a text-only passthrough); hosts whose catalogue predates `deepseek-flash` keep the documented degradation and skip the check.
- The card moved from the Settings → Plugins tab to the Plugins page (`plugins.item`, Official group) with a `summary` one-liner and a `page` form, and reads the shell's current session from the main-view retention — the removed `SessionListState.current` no longer leaves the selector permanently disabled.
- Declared `dsh.manifestVersion: 1` and the `engines.dsh` range; the peer range now also admits the 0.1.6 line.

### Fixed

- The strict Typert codecs now carry the `create()` factory the 0.1.6-alpha.2 typert-loader requires, so the plugin tree boots on the new line (the dual-face codec keeps the rc.2 `schema` field too).
- Per-agent routing state is backfilled synchronously on `agent/created`, so the first request of a turn no longer pays the lazy-init path.

## [0.2.3] - 2026-09-12

### Changed

- Rename the four translated READMEs to `README-<lang>.md`. npm selects the package-page readme as the first markdown file matching its `{README,README.*}` glob (`@npmcli/package-json`, publish path), and that glob order puts `README.<lang>.md` ahead of `README.md` — so npm was serving the Simplified-Chinese file for every package of this family (measured on 15/15 sampled packages). The new names sit outside the glob, so the English source is served again. No content changed: the four renames are byte-identical (verified by content hash) and `check:readmes` still passes. Takes effect from the next release; an already-published version cannot gain a corrected readme retroactively.
- `scripts/check-readme-sync.mjs` now fails when the package root holds more than one npm-visible `README*.md` (it mirrors npm's `{README,README.*}` glob plus the markdown test), so the regression cannot return silently.
- Pin the `@deepseek-ai/dsh-*` dev/test dependencies to the published `0.1.5-rc.2` line and record `0.1.5-rc.2` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now runs against `0.1.5-rc.2`. The peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` is unchanged, so no supported host line is dropped.

## [0.2.2] - 2026-09-10

### Changed

- Align the `plugin-doctor` CI gate with the family standard: the job now pins `@perrylink/dsh-plugin-doctor@0.1.6` and passes `--only "R,K"` directly, retiring the `0.1.4` pin and the `DOCTOR_ONLY` variable that carried the two group names as YAML `\u` escapes. The gate is now identical to the other 36 repositories and keeps its `R0` guard, which fails loudly when the doctor runs no checks. No runtime change.

### Docs

- Add the ecosystem-standard badge block (Gitee mirror, License, DSH plugin, dsh-doctor, Node, CI, Version) under the H1 of all five READMEs; the rest of each file is unchanged. The `dsh-doctor` badge target and the Gitee mirror were verified to exist before being referenced. This release is what puts the badges on the npm page: npm renders the README from the published tarball, so the GitHub-only commit was not visible there.

## [0.2.1] - 2026-09-10

### Changed

- Pin the `@deepseek-ai/dsh-*` dev/test dependencies to the published `0.1.5-rc.1` line and record `0.1.5-rc.1` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now runs against `0.1.5-rc.1`. The peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` is unchanged, so no supported host line is dropped.

### Docs

- Refresh the five-language README compatibility baseline to `dsh-v0.1.5-rc.1` (verified 2026-09-10).

## [0.2.0] - 2026-09-09

### Added

- **Browser half: a Settings card and a composer tier pill.** The plugin now
  ships a `tier` Typert Remote service (`tier/status`, `tier/catalog`,
  `tier/setMode`) behind a hand-written `./typert` host manifest, and a client
  bundle that registers the composer pill into `conversation.input.left`
  (id `tier-pill`) and the autotier card into the Plugins settings section
  (`settings.plugins.tab`, id `autotier`). The pill shows the session's effective
  mode (`AUTO` / `STRONG` / `CHEAP` / `OFF`) with an escalation badge and cycles
  the session override on click; the card offers the full
  `auto | strong | cheap | delegated | off` selector, the read-only tier
  landings, the live session state, and a model-catalog dropdown fed by the live
  `ctx.llm` registry. Copy ships in English and Simplified Chinese.
- `TierStatus` extends the public `AutotierStatus` additively with a `session`
  view (override, effective mode, applied tier and source, escalation, plan
  mode, guard denials); the host still serves `ctx.autotier.status()` unchanged.
- `zod` is now a runtime dependency (the strict wire codecs on both faces) and
  the client peers (`dsh-api-remotes`, `dsh-client-connection`,
  `dsh-client-locale`, `dsh-client-ui-conversation`, `dsh-client-ui-settings`,
  `dsh-client-ui-slots`, `dsh-typert-protocol`) are declared as optional peers.

### Notes

- The session override stays runtime-only: `auto` clears it, and a plugin reload
  restores the `cordis.yml` routing mode. Nothing is persisted.
- `pnpm run verify:artifacts` now asserts the two new shipped faces
  (`lib/typert.host.js` with its manifest shape, `lib/client.js` with its
  ModuleLoader handshake and external platform modules).
- The five-language READMEs are not updated in this change; the client copy is
  English + Simplified Chinese only.

## [0.1.1] - 2026-09-09

### Added

- **Route pre-flight against the live registry.** Before a tier landing is
  written into the request configuration, the plugin now checks the two facts
  that would fail the request outright: the provider route must be registered,
  and the target model must declare the configured reasoning effort. An
  unregistered provider redirects to a registered fallback chain entry; an
  unsupported effort is dropped so the adapter default applies; an adapter that
  cannot answer is treated leniently. Both answers are cached per
  `provider/model`, and each degradation is logged once.
- Compat workflow now runs its profile job over a matrix of both published
  harness lines (`0.1.2-rc.1` and `0.1.5-alpha.1`), so drift in either is caught
  automatically.

### Changed

- Peer ranges name both published lines explicitly
  (`>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0`): a semver range whose only
  prerelease comparator sits on an earlier version tuple does not admit a later
  alpha, so the previous range left `0.1.5-alpha.1` unsatisfied.
- `dsh.compatibility.dshReleases` and the five READMEs now declare
  `0.1.5-alpha.1` compatible after an end-to-end verification (real profile
  install, `--dump-config` row, keyless headless smoke).

## [0.1.0] - 2026-09-09

### Added

- **Automatic tier routing on the official seam.** A load-time `agent/request`
  waterfall listener registered on the root scope with `{ prepend: true }`
  replaces the provider/model/effort triple while preserving the sampling
  scalars the session already chose (`temperature`, `maxTokens`, `stop`). It
  always awaits `next()` exactly once and never returns `undefined`.
- **Deterministic intent gate (zero tokens).** Declarative rule table
  (`intent.rules`: patterns/tools/cwd, priority-ordered), explicit-intent
  patterns, bilingual keyword scoring with word boundaries and a CJK
  co-occurrence rule, structural signals (token bands, tool calls, code fences,
  hard hints, turn depth), image and long-text short-circuits, and the
  attempt-first middle band (shipped disabled).
- **Low-confidence judge.** Only a turn below `intent.ruleThreshold` calls a
  cheap model, never on cooldown, and abstains after
  `intent.judge.unavailableSkip` consecutive failures.
- **Fingerprint posteriors.** Per-shape `{cheap,strong}` win-rate counters with
  a Wilson lower bound, ε-greedy exploration, half-life decay and an LRU cap.
  Labels come from terminal turn outcomes only, never from the router's own
  judge call.
- **Decision state machine.** Precedence: session override → active escalation →
  plan mode → fallback chain → declarative rule → posterior → classifier, with a
  double-threshold hysteresis (`toStrong` / `toCheap`) that damps tier flapping.
- **Plan-mode handoff.** A complex instruction opens plan mode through the
  optional `planMode` service, falling back to an appended `plan/mode` event when
  the service is not reachable; leaving plan mode returns the session to the
  cheap tier.
- **High-risk guard on `tools/pre-execute`.** A deterministic, tier-conditional
  denial covering recursive-force deletes (including `sh -c` wrapper payloads the
  upstream rule set misses), destructive commands, credential paths and the
  configured `guard.protectedPaths` review surfaces. A guard that throws
  escalates to the strong tier instead of allowing the call.
- **Failure escalation and fallback chains.** Same-signature recurrence counting
  within a window raises the tier for a TTL; the effort-first ladder raises the
  current model's effort before paying for a model switch. Permanent route
  failures switch the fallback chain immediately, transient failures wait for
  `dsh-llm-retry` exhaustion (this listener is registered after it on purpose).
- **Surfaces.** `/tier auto|strong|cheap|off|status`, the read-only `tier_status`
  and `tier_route` tools, the `ctx.autotier` service (`status`, `catalog`), the
  `autotier/route` serial veto event, the `autotier/tier-changed` emit event, and
  a host+wire `autotier` session projection folding `request/header` and
  `plan/mode`.
- **Configuration.** A Schemastery settings namespace (`autotier`) with
  save-time cross-field validation: tier landings, fallback chains, intent
  thresholds, rules, judge, scenarios, cost mode, guard and escalation switches.
  Reasoning effort accepts exactly the adapter vocabulary
  `off | low | high | max`; the default strong model is `deepseek-v4-pro` and the
  default cheap model is `deepseek-v4-flash`.
- Five-language READMEs, `cordis.patch.yml` with every key documented inline,
  Apache-2.0 license, security policy and third-party notices (including the
  MIT-licensed guard-rule port and its deliberate deltas).
- CI workflows: `ci.yml` (typecheck against the checkout faces, `typecheck:ci`
  against the published `0.1.2-rc.1` faces, tests, coverage, lint, README sync,
  build, artifact and self-containment verification), `compat.yml` (real profile
  install, `--dump-config` activation assertion, keyless headless smoke,
  uninstall rollback), `release.yml` (npm provenance + GitHub Release),
  `scorecard.yml` and `plugin-doctor.yml`.
- Test suites (153 cases): config schema and cross-field resolution, the
  function-plugin contract, fiber-disposal lifecycle over the real host
  services, a real Loader composition over a temporary `cordis.yml`, the guard
  rule table with a 5,909-command upstream-equivalence harness (the port itself
  carries 30 cases, 14 of them case-for-case upstream ports), the classifier
  and posterior matrix, the decision state machine, and a real AgentLoop
  integration suite covering simple/complex routing, the `/tier` override,
  escalation after two same-signature failures, fallback-chain switching and the
  tier projection.

### Known limitations

- No browser half yet: the Settings card and composer tier pill are planned for
  v0.2; the host surface they need (`ctx.autotier.status()`/`catalog()`) ships.
- Fingerprint posteriors are in-memory and reset on restart.
- The attempt-first middle band ships disabled until the calibration corpus and
  its metric gate land.
- A model picked in the GUI is not detected automatically; use
  `routingMode: delegated` or `/tier off`.
