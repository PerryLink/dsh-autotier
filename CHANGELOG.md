# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
