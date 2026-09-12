# dsh-autotier

[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-autotier)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-autotier.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![Node](https://img.shields.io/badge/node-%5E22.19.0%20%7C%7C%20%3E%3D24.0.0-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-autotier/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-autotier/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-autotier?label=version)](https://github.com/PerryLink/dsh-autotier/releases)

**English** | [简体中文](README-zh.md) | [Español](README-es.md) | [Português](README-pt.md) | [हिन्दी](README-hi.md)

Automatic model-tier routing for DeepSeek Harness: one user instruction enters,
one tier decision comes out — no manual model switching.

Complex intent (architecture, planning, debugging, multi-step engineering) is
planned on the **strong** tier and then implemented on the **cheap** tier.
Simple intent (questions, retrieval, batch chores, daily work) is designed and
implemented on the **cheap** tier directly. While the cheap tier executes,
high-risk tool calls are denied by a deterministic guard, and repeated failures
escalate to the strong tier with a TTL fallback.

- **Official repository**: <https://github.com/PerryLink/dsh-autotier>
- **npm**: `dsh-autotier` (bare, unscoped)

## Compatibility

| Harness | Status |
|---|---|
| `@deepseek-ai/dsh` `0.1.2-rc.1` | compatible; the compat workflow installs this line end-to-end |
| `@deepseek-ai/dsh` `0.1.5-rc.2` | compatible; verified end-to-end (real profile install, `--dump-config` row, keyless headless smoke) and in the compat matrix |
| `@deepseek-ai/cordis` `^4.0.2`, `@deepseek-ai/schemastery` `^3.18.2` | peer baseline |

Peer ranges name both published lines explicitly (`>=0.1.2-rc.1 <0.2.0 ||
>=0.1.5-alpha.1 <0.2.0`), because a semver range whose only prerelease
comparator sits on an earlier version tuple does not admit a later alpha.
They are refreshed per published wave.

The plugin is host-plane only. It needs no agent preset of its own: the host
row applies to every session. A one-line prompt section in *your* preset is
optional and only makes the router's decisions visible to the model (see
[Install & uninstall](#install--uninstall)).

## What you get

- **Intent gate** — every turn is classified from deterministic signals
  (message text, tool names, image presence, conversation length). The
  zero-token rule layer decides when it is confident; only a low-confidence turn
  calls the cheap judge model, and never on a cooldown.
- **Tier landing on the official seam** — the decision is applied on the
  `agent/request` waterfall by returning a replacement provider/model/effort
  triple. Sampling scalars the session already chose (`temperature`, `maxTokens`,
  `stop`) are preserved.
- **Plan-mode handoff** — a complex instruction enters plan mode on the strong
  tier; leaving plan mode drops back to the cheap tier for implementation.
- **High-risk guard** — while the cheap tier executes, destructive commands
  (`rm -rf`, `sudo`, `mkfs`, `git push --force`, credential-file writes, …) are
  denied with a corrective message telling the model to escalate instead.
- **Failure escalation** — repeated failures (optionally same-signature) raise
  the tier for a TTL; a model/route failure walks the configured fallback chain.
- **Manual escape hatches** — `/tier auto|strong|cheap|off` and the
  `tier_status` / `tier_route` tools. Setting `routingMode: delegated` (or
  `/tier off`) stops routing for a session that must keep its own model.
- **`ctx.autotier` service** — a small read surface (`status`) plus the
  `autotier/route` veto waterfall and `autotier/tier-changed` event, so other
  plugins can observe or override a decision.

## Quick start

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

Then start (or restart) the harness. The row is appended to your profile's
`cordis.patch.yml`; routing starts on the next turn with no further setup.

## Install & uninstall

**npm channel**

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

**git channel**

```bash
git clone https://github.com/PerryLink/dsh-autotier.git
cd dsh-autotier && pnpm install && pnpm run build
dsh plugin --profile web add .
```

**Optional preset prompt section.** The router works without it. To let the
model know which tier it is running on, add one row to *your* agent preset
(`docs/preset-row.md` has the exact block):

```yaml
- insert:
    - id: autotier-prompt
      name: '@deepseek-ai/dsh-system-prompt'
      # sections: [...]  — see docs/preset-row.md
```

**Uninstall**

```bash
dsh plugin --profile web remove dsh-autotier
```

The row, its settings namespace, its command, its tools and its listeners are
all removed with the plugin; nothing is written outside the settings document.

## Configuration

Every key is validated at load time; an invalid value fails loudly instead of
silently disabling routing. `cordis.patch.yml` in this repository documents the
same keys inline.

| Key | Default | Meaning |
|---|---|---|
| `tiers.strong.provider` | `deepseek-official` | Provider for the planning/review tier. |
| `tiers.strong.model` | `deepseek-v4-pro` | Catalog id of the strong model. |
| `tiers.strong.effort` | `high` | Adapter vocabulary `off` \| `low` \| `high` \| `max`. |
| `tiers.strong.followSession` | `false` | `false` = this tier's effort overrides the session's. |
| `tiers.strong.fallback` | `[]` | Ordered provider/model landings when the tier is unavailable. |
| `tiers.cheap.provider` | `deepseek-official` | Provider for the implementation tier. |
| `tiers.cheap.model` | `deepseek-v4-flash` | Catalog id of the cheap model. |
| `tiers.cheap.effort` | `low` | Adapter vocabulary `off` \| `low` \| `high` \| `max`. |
| `tiers.cheap.followSession` | `true` | `true` = inherit the session's effort so an explicit choice wins. |
| `tiers.cheap.fallback` | `[]` | Ordered provider/model landings when the tier is unavailable. |
| `tiers.vision.provider` | `deepseek-official` | Provider for image-carrying turns. |
| `tiers.vision.model` | `deepseek-v4-flash-vision-exp` | The catalog's image-capable model. |
| `intent.ruleThreshold` | `0.7` | Confidence at or above which the rule layer decides alone. |
| `intent.attemptBand.enabled` | `false` | Start the middle band on the cheap tier and escalate on a signal. |
| `intent.attemptBand.tauLow` | `0.45` | Lower bound of the attempt-first band. |
| `intent.hysteresis.toStrong` | `0.8` | Score that switches a cheap turn to strong. |
| `intent.hysteresis.toCheap` | `0.6` | Score below which a strong turn returns to cheap. |
| `intent.rules` | `[]` | Declarative rule table (`when.patterns` / `when.tools` / `when.cwd`, `tier`, `priority`). |
| `intent.judge.enabled` | `true` | Allow the low-confidence judge. |
| `intent.judge.model` | `''` | Judge model id; empty = first catalog model containing `flash`. |
| `intent.judge.temperature` | `0` | Judge sampling temperature. |
| `intent.judge.maxTokens` | `16` | Judge output cap (it answers with one word). |
| `intent.judge.cooldownMs` | `30000` | Minimum gap between two judge calls. |
| `intent.judge.timeoutMs` | `2000` | Judge call timeout. |
| `intent.judge.unavailableSkip` | `2` | Consecutive judge failures after which the turn skips it. |
| `intent.scenarios` | all `true` | Per-scenario switches: `coding`, `review`, `planning`, `retrieval`, `batch`, `daily`, `longText`, `multimodal`. |
| `intent.costMode` | `balanced` | Ambiguity arbitration: `cost-first` \| `quality-first` \| `balanced`. |
| `guard.enabled` | `true` | Enable the deterministic high-risk guard. |
| `guard.tiers` | `[cheap]` | Tiers the guard protects. |
| `guard.whitelist` | `[]` | Commands, tools or path prefixes that never trip the guard. |
| `guard.protectedPaths` | `['.dsh','AGENTS.md','package.json','.github/workflows']` | Self-modification surfaces that force strong-tier review. |
| `guard.interopDefend` | `auto` | Relationship with `dsh-defend`: `auto` audits coexistence, `none` stays silent. |
| `escalation.threshold` | `2` | Failures within the window that raise the tier. |
| `escalation.windowMs` | `60000` | Failure-counting window. |
| `escalation.ttlMs` | `180000` | How long an escalation stays in effect. |
| `escalation.fallbackTtlMs` | `300000` | TTL used after a fallback landing was taken. |
| `escalation.signature` | `true` | Count same-signature recurrences instead of every failure. |
| `routingMode` | `auto` | `auto` \| `strong` \| `cheap` \| `delegated` \| `off`. |

All keys can also be edited live from the `autotier` settings namespace
(`$DSH_HOME/settings.yaml`); a write that violates a cross-field requirement is
refused at save time and the last good policy stays in effect.

## Tools & surfaces

| Surface | Kind | Purpose |
|---|---|---|
| `/tier` | command | `auto` \| `strong` \| `cheap` \| `off` \| `status`; session-scoped override. |
| `tier_status` | tool | Current tier, mode, escalation TTL and guard state. |
| `tier_route` | tool | Route one intent string without sending a request (dry run). |
| `ctx.autotier` | service | `status()` read surface for other plugins. |
| `autotier/route` | serial event | Third parties may veto a proposed tier. |
| `autotier/tier-changed` | emit event | Observability when the effective tier changes. |

## Permissions & data

- **Files** — the plugin reads nothing and writes nothing except through the
  shared settings service (the `autotier` namespace).
- **Network** — the only outbound traffic is the judge call, which goes through
  the normal `ctx.llm` path and the configured provider.
- **Session log** — the plugin appends no custom session events. The routing
  trail is the plugin logger plus the live `autotier/tier-changed` bus event;
  the only append it makes is the `plan/mode` fallback when the plan-mode
  service is absent. Custom event types are fail-closed on `0.1.2-alpha.1` and
  later, so no durable plugin-owned record is written.
- **Secrets** — no credential is read, logged or stored by this plugin.

## Security boundaries

- The guard is a **defence in depth**, not a sandbox. It denies the patterns it
  knows on the cheap tier and never weakens `dsh-defend`, the approval service,
  or the sandbox policy. Keep those enabled.
- The guard protects only the tiers listed in `guard.tiers` (cheap by default).
  A strong-tier turn is not blocked by design: the strong model is the reviewer.
- If the guard itself throws, the call is escalated to the strong tier rather
  than allowed — a broken guard must not become an open door.
- `/tier off` disables routing entirely; the harness then behaves exactly as it
  did before the plugin was installed.

## Known limitations

- The rule layer is deterministic and therefore finite: a novel phrasing of a
  complex request may start on the cheap tier and escalate only after a failure
  or a guard denial. The judge call covers the low-confidence middle.
- Escalation is per-agent and in-memory; a harness restart starts from `auto`.
- Tier switching resets the provider prompt cache for the changed request, so
  very chatty sessions may see a small cache-miss cost on the switch turn. The
  hysteresis thresholds exist to keep that rare.
- The plugin routes conversation requests. Compaction and title generation are
  separate host seams; align their own model settings with the cheap tier if you
  want the same cost profile (`docs/supporting-lanes.md`).
- `followSession: true` on the cheap tier means an explicit session model choice
  wins; in that case the cheap tier cannot force its own model.
- **The Settings card and composer tier pill shipped in 0.2.0.** The card
  (routing mode, live tier landings, model catalog) lives in the Plugins settings
  section and the pill cycles the session mode from the composer.
- **A model picked in the GUI is not detected automatically.** The router does
  not watch the `agent-default-model` document, so switching models there does
  not by itself stop routing — use `routingMode: delegated` or `/tier off`.
- **Fingerprint posteriors are in-memory.** They reset on restart and re-learn
  from the judge's cold-start fallback; persisting them through the settings
  document is planned for v0.2.
- **The attempt-first middle band ships disabled.** `intent.attemptBand.enabled`
  stays `false` until the calibration corpus and its metric gate land (v0.2).

## Development

```bash
pnpm install
pnpm run typecheck      # against the local harness checkout type faces
pnpm run typecheck:ci   # against the published 0.1.5-rc.2 faces (what CI runs)
pnpm test
pnpm run build
pnpm run verify:self-contained
pnpm run verify:artifacts
pnpm pack
```

`pnpm run build` emits `lib/types` (tsc declarations) and `lib/index.js`
(tsdown bundle). Tests use the published host packages directly — real
`Context`, real session/tools/commands/settings services — plus one real Loader
composition over a temporary `cordis.yml`.

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `router`,
`model-tier`, `cost`, `auto`.

## Contributors

PerryLink. Issues and pull requests are welcome at
<https://github.com/PerryLink/dsh-autotier/issues>.

## PerryLink DSH Plugin Family

This project is one of the [40 DeepSeek Harness plugins](https://github.com/PerryLink) maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Unified session + workspace + config checkpoints with one-shot `/rewind` | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code, Codex, OpenCode and Hermes sessions, memories and skills into DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Deterministic dataset profiling, cleaning and citation verification | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics: load, spill, compaction and cache hit rate | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Chinese mutual-fund research with sealed, traceable source snapshots | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issue/CI integration with every write approval-gated | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry and company research pack: chain map, policy timeline, company cards | |
| **[dsh-kit](https://github.com/PerryLink/dsh-kit)** | One-command starter pack that installs the core family | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base with hybrid search and citation-aware injection | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local Ollama model discovery and task-based routing with cloud fallback | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions, symbols and rename | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking at the model boundary with a host-side restore table | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | MCP management console: `/mcp` command, Settings tab and trial calls | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory protocol (`ctx.memory` + SQLite) | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse telemetry export from the session event stream | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Runtime-switchable model output styles | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Declarative allow/deny/ask rules plus a process-level network policy | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-dev knowledge base, agent skill and the `dsh-plugin-dev` CLI toolchain | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-portal](https://github.com/PerryLink/dsh-plugin-portal)** | Zero-dependency static portal rendering the whole plugin family as one page | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat, Telegram, Feishu + a session console | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research reports: evidence ledger, manifest seal, per-claim verdicts | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional plugin quality scoring with an evidence-backed leaderboard | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions and workspaces in the Web sidebar with per-pin colors | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Git-backed cross-device session synchronization with keep-both merges | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack plus the `plugin_vet` supply-chain gate | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop: speech-to-text input and text-to-speech replies | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives with a pass/fail matrix | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel plus eleven agent tools | |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair | |
| **[dsh-wechat](https://github.com/pan17/dsh-wechat)** | WeChat ↔ DSH bridge (Tencent iLink bot) developed with [pan17](https://github.com/pan17/dsh-wechat), who hosts the repo | |
| **[dsh-personal-directive](https://github.com/PerryLink/dsh-personal-directive)** | Personal directive injector with a top-bar toggle (fork of liucai2026/dsh-personal-directive) | |

## License

Apache-2.0. See [LICENSE](./LICENSE) and
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
