# dsh-autotier

```sh
dsh plugin --profile <name> add dsh-autotier
```


**English** | [简体中文](README-zh.md) | [Español](README-es.md) | [Português](README-pt.md) | [हिन्दी](README-hi.md)

Automatic model-tier routing for DeepSeek Harness: one user instruction enters,
one tier decision comes out — no manual model switching.


[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-autotier)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/PerryLink/dsh-autotier/badge)](https://api.securityscorecards.dev/projects/github.com/PerryLink/dsh-autotier)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-autotier.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19.0%20%7C%7C%20%3E%3D24.0.0-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-autotier/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-autotier/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-autotier?label=version)](https://github.com/PerryLink/dsh-autotier/releases)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-autotier?metric=downloads)](https://dshfind.com/plugins/PerryLink/dsh-autotier?ref=badge)

Complex intent (architecture, planning, debugging, multi-step engineering) is
planned on the **strong** tier and then implemented on the **cheap** tier.
Simple intent (questions, retrieval, batch chores, daily work) is designed and
implemented on the **cheap** tier directly. While the cheap tier executes,
high-risk tool calls are denied by a deterministic guard, and repeated failures
escalate to the strong tier with a TTL fallback.

- **Official repository**: <https://github.com/PerryLink/dsh-autotier>
- **npm**: `dsh-autotier` (bare, unscoped)

**📖 Ecosystem knowledge base** — measured data, not marketing: [plugin development guide · plugin-selection data · maintenance criteria](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Install & uninstall

**npm channel**

```bash
dsh plugin --profile web add dsh-autotier
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

**git channel**

```bash
dsh plugin --profile web add github:PerryLink/dsh-autotier
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

The row, its command, its tools and its listeners are all removed with the
plugin. Configuration a user saved through the Plugins page lives in the active
profile patch and belongs to that profile, not to this plugin; removing the row
leaves it there untouched.

## ⭐ 如果它帮到了你

这个插件是 [DSH 插件家族](https://github.com/PerryLink)的一员（40+ 个，全部 Apache-2.0）。如果你在用，**给个 star** —— 它不会解锁任何功能，但会让下一个人在搜索里更容易找到它。

*English:* part of a 40+ plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.


## What is dsh-autotier?

npm channel

git channel

![Terminal demo of dsh-autotier: dsh-autotier — install, then the documented tier defaults behind /tier](https://raw.githubusercontent.com/PerryLink/dsh-autotier/main/docs/assets/dsh-autotier-hero.png)

![Animated terminal demo of dsh-autotier](https://raw.githubusercontent.com/PerryLink/dsh-autotier/main/docs/assets/dsh-autotier-demo.gif)

*The same run, animated.*

## Compatibility

| Harness | Status |
|---|---|
| `@deepseek-ai/dsh` `0.1.2-rc.1` | no longer supported; that line predates the `SettingsForms` contract this plugin now targets |
| `@deepseek-ai/dsh` `0.1.5-rc.2` | no longer supported; the `settings.register` / `settings/updated` contract it exposes was removed upstream |
| `@deepseek-ai/dsh` `0.1.6-alpha.2` | no longer supported; same removal, first line to ship `SettingsForms` |
| `@deepseek-ai/dsh` `0.1.7-rc.2` | compatible; verified on the 0.1.7 line |
| `@deepseek-ai/dsh` `0.2.1-rc.2` | **required**; verified against the matching checkout (`typecheck`) and the published packages (`typecheck:ci`, 214 tests) |
| `@deepseek-ai/cordis` `^4.0.3`, `@deepseek-ai/cosmokit` `^1.8.4`, `@deepseek-ai/schemastery` `^3.18.3` | peer baseline |

Peer ranges name all published lines explicitly (`>=0.1.6-0 <0.2.0 || >=0.2.0-0 <0.3.0 || >=0.2.1-0 <0.3.0`), because a semver range whose only prerelease
comparator sits on an earlier version tuple does not admit a later alpha.
They are refreshed per published wave. The declared range is deliberately wider
than the verified one: it documents what the manifest accepts, not what has been
tested.

**This release is a breaking adaptation.** The `0.1.6`-generation harness
removed the settings *provider* seam this plugin was built on: the
`@deepseek-ai/dsh-settings-file` package is gone, `ctx.settings` is now
`SettingsForms` (a schema→form projector, with no `register`), and
`settings/updated` no longer exists. There is no shared surface that lets one
plugin observe another plugin's settings document, so no version of this plugin
can support both contracts at once. Configuration now flows through the host's
volatile-config mechanism, and the per-session routing mode — the setting that
actually changes behaviour at runtime — is unchanged.

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

```sh
dsh plugin --profile web add github:PerryLink/dsh-autotier
```

```bash
dsh plugin --profile web add dsh-autotier
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

Then start (or restart) the harness. The row is appended to your profile's
`cordis.patch.yml`; routing starts on the next turn with no further setup.

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
| `tiers.cheap.model` | `deepseek-flash` | Catalog id of the cheap model. |
| `tiers.cheap.effort` | `low` | Adapter vocabulary `off` \| `low` \| `high` \| `max`. |
| `tiers.cheap.followSession` | `true` | `true` = inherit the session's effort so an explicit choice wins. |
| `tiers.cheap.fallback` | `[]` | Ordered provider/model landings when the tier is unavailable. |
| `tiers.vision.provider` | `deepseek-official` | Provider for image-carrying turns. |
| `tiers.vision.model` | `deepseek-flash` | The catalog's image-capable model. |
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

All keys can also be edited live from the plugin's card on the Plugins page; the
Host validates the new value against the schema and commits it with
`loader/volatile-update`, and this plugin then re-judges the whole configuration
through the same cross-field judge the mount path uses. A value that violates a
cross-field requirement (two tiers landing on the same route, a hysteresis pair
that cannot stop flapping, a rule with neither a pattern nor a tool) leaves the
last good policy routing instead of swapping in something unroutable.

`routingMode` is the one key that is **not** live: it is the composition
default, and the runtime switch is the session-scoped override written by
`/tier`, the composer pill and the card's selector. Making it live as well would
give the same behaviour two owners.

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

- **Files** — the plugin reads no file and writes none. Configuration is the
  host's: a value saved on the Plugins page is persisted by the Host into the
  active profile patch, and this plugin only reads the live snapshot it is
  handed.
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
pnpm run typecheck:ci   # against the published 0.1.7-rc.2 faces (what CI runs)
pnpm test
pnpm run build
pnpm run verify:self-contained
pnpm run verify:artifacts
pnpm pack
```

`pnpm run build` emits `lib/types` (tsc declarations) and `lib/index.js`
(tsdown bundle). Tests use the published host packages directly — real
`Context`, real session/tools/commands services — plus one real Loader
composition over a temporary `cordis.yml`. The `settings` service is the one
stand-in: the host's real `SettingsForms` binds to `configEditor`,
`profileContext` and the Loader's fiber graph, none of which this plugin
consumes, while the plugin's whole contract with it is `configure({ auto })`
plus the Loader's `loader/volatile-update` event.

## Interoperability with other DSH plugins

Verified against **DSH `0.2.0-rc.2`** (the runtime this README ships for) and the high-star plugin set surveyed on 2026-10-05.

This plugin **does not interfere** with other plugins, including the widely installed high-star ones:

- **No tool-name collision.** Every tool is namespaced; no bare name owned by a shipped tool or another plugin is registered.
- **No service-key collision.** It provides `autotier`; that key is not a built-in seam and is not provided by any surveyed high-star plugin.
- **No slot collision.** It registers no client slot key, so it cannot contend for a `shadows-shipped-ui` seat.
- **No HTTP route collision.** It registers no `webServer` prefix.
- **No patch-layer collision.** The bundle patch only `insert`s its own row; it never overrides a built-in row's `config`.
- **No global mutation.** It does not patch prototypes, rewrite `process.env`, or replace the global fetch dispatcher.

**Shared event listeners are non-interfering by construction.** It observes the ordering-sensitive events `agent/created`, `agent/request`, `agent/request-error`, `tools/pre-execute` with `ctx.on()` — Cordis's broadcast registration, where every listener runs and none can starve another. **Every listener here delegates through `next()`**, so the chain is never short-circuited, and a mutation is applied to the value `next()` produced rather than returned in its place:
  - `agent/request` — also used by `dsh-agent-teams` (1923★), which short-circuits by throwing without calling `next()`.
  - `tools/pre-execute` — also used by `cc-safety-net` (1576★).

Static evidence: `dsh-plugin-doctor` K10–K13 report `pass` for every check on this repository.

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `router`,
`model-tier`, `cost`, `auto`.

## Contributors

PerryLink. Issues and pull requests are welcome at
<https://github.com/PerryLink/dsh-autotier/issues>.

**Applicable DSH version:** verified against `dsh-v0.2.1-rc.2` (the host release this build targets); requires `>=0.1.6-0 <0.2.0` / `>=0.2.0-0 <0.3.0` / `>=0.2.1-0 <0.3.0`.

## PerryLink DSH Plugin Family

This project is one of the **87 actively maintained** DeepSeek Harness plugins from [PerryLink](https://github.com/PerryLink). The family roster is **95** plugins in total — **5 frozen**, **3 retired** — and stays collapsed below so every README keeps a short first screen. Expand it to see every row, with the reason in the Status column.

<details>
<summary>Expand all 95 plugins</summary>

| Plugin | One-liner | Status |
|---|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** | 水产养殖投入品记录核对（按投入品用量、休药期与起捕间隔核对记录自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** | 档案归档完整性与保管期限核对（依据《档案法》及配套规定，仅提示差异，不作出定性结论） |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command |  |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | 🚫 RETIRED — see the repo README |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** | 投标文件符合性预检（按招标文件逐条核对响应情况，仅提示差异，不作出定性结论） |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** | 投标人资格条件核对（按资格条件与证明材料核对逐条响应，仅提示差异，不作出定性结论） |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | 🧊 FROZEN — see the repo README |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | 🧊 FROZEN — see the repo README |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** | 合同条款立场台账核对（按立场、风险等级与退让底线核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** | 报关单证一致性核对（按公开的报关单填制规范核对单证间字段一致性，仅提示差异，不作出定性结论） |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | 🧊 FROZEN — see the repo README |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** | 滞箱费台账核对（按免箱期与费率核对超期天数与金额的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | 🧊 FROZEN — see the repo README |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** | 应急演练脚本核对（按阶段、响应分级、指挥与资源要素核对脚本齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** | 环评导则适用性核对（按要素、导则名称与执行标准核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** | 应急预案要素齐备性与条款级页码定位（依据 GB/T 29639-2020 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** | 作文量表评分核对（按评分项、原文定位与分值算术核对评分自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** | 证据清单齐备性核对（按待证事实与证据要素核对清单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** | 出口管制物项核对（按管制清单、最终用途与许可证核对台账齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** | FMEA 分析表要素齐备性与风险顺序数一致性核对（按公开的 FMEA 方法标准核对表内自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** | 预测准确率考核核对（按准确率、门槛与考核单价核对考核费用的算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** | 公文流转与办理时限核对（按公开的公文处理规范核对环节完整性与时限，仅提示差异，不作出定性结论） |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** | 公文格式要素核对（按公开的党政机关公文格式标准核对版头与主体要素，仅提示差异，不作出定性结论） |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** | 劳动保护与安全防护用品配置表核对（按公开的配备标准核对品名规格与配置数量，仅提示差异，不作出定性结论） |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** | 危险化学品临界量与重大危险源辨识核对（按储存量与临界量核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** | HAZOP 分析表要素齐备性与偏差推导一致性核对（依据公开的危险与可操作性分析标准，仅提示差异，不作出定性结论） |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** | 安全隐患台账→《工贸企业重大事故隐患判定标准》（应急管理部令第10号）条款映射提示（仅提示差异，不作出定性结论） |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** | 商品归类层级一致性核对（按章、品目、子目与商品编号的层级关系核对自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** | ICD 合并编码与星剑号配对提示（依据 GB/T 14396-2016 与公开的 ICD 使用说明，仅提示差异，不作出定性结论） |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** | 法条引用与文书要素核对（按名称、条号、原文与效力状态核对引用可核验性，仅提示差异，不作出定性结论） |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** | 信用证单据条款核对（按单据种类、份数、期限与不符点核对交单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** | 能力差距与培养计划核对（按能力等级差、培养措施与完成期限核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** | 病案首页形式质控与逻辑矛盾提示（依据国卫办医发〔2016〕24号等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** | 国家自然科学基金申请书形式审查与匿名化提示（依据《国家自然科学基金条例》与申请人导入的当年指南，仅提示差异，不作出定性结论） |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** | 护理记录时限、签名与评估表完整性校验（依据《病历书写基本规范》等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** | 原产地区域价值成分核对（按 RVC 定义式与门槛核对原产地判定自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** | 在线点评回复台账核对（按回复时限、问题分类与整改状态核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** | 试卷解析结构核对（按题型、答案、分值与 yotta 标识核对试卷结构自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** | 行政许可办理核对（按申请材料、法定时限与决定记录核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** | 项目全流程文件链条核对（按环节先后与金额口径核对链条自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** | 起诉状要素齐备性核对（按诉请、事实、证据、法条四要素核对文书齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** | 政策专报要素核对（按观点、依据、出处与建议核对专报齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** | 线损电量拆分与考核表核对（依据公开的线损计算口径，仅提示差异，不作出定性结论） |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** | 电力工作票要素齐备性与签发许可顺序核对（依据现行电力安全工作规程，仅提示差异，不作出定性结论） |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** | PPAP 提交要素齐备性核对（按公开的 PPAP 手册与提交等级核对要素齐备与版本填写，仅提示差异，不作出定性结论） |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** | 质疑与投诉期限核对（按公开的政府采购质疑投诉规定核对期限与台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** | 铁路施工天窗台账核对（按时间窗、时长算术与命令号核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | 🧊 FROZEN — see the repo README |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** | 维修工单结算核对（按项目金额、配件工时合计与结算总额核对算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** | 审稿意见逐条回应覆盖核对（按意见与回应一一对应核对覆盖完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** | 规则库文件自检核对（按条款引用纪律与效力上限核对规则库自身合规，仅提示差异，不作出定性结论） |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** | 安全技术交底记录要素齐备性与签字闭环核对（依据公开的安全生产法规与检查标准，仅提示差异，不作出定性结论） |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | 🚫 RETIRED — see the repo README |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** | 监理日志跨日连续性与旁站覆盖提示（依据 GB/T 50319-2013 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** | 三重一大决策台账核对（按前置研究、会议审议与决议记录核对程序留痕，仅提示差异，不作出定性结论） |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** | 土壤与地下水监测台账核对（按点位、监测项目、限值与超标判定核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** | 作业规程与 FMEA／控制计划一致性核对（按编号与版本核对三份文件是否同步，仅提示差异，不作出定性结论） |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** | 控制图常数与过程能力指数核对（按 GB/T 4091 的常规控制图常数表核对控制限与 Cp/Cpk 的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | 🚫 RETIRED — see the repo README |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** | 招标文件条款摘录核对（按出处与原文逐字核对摘录完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** | 评标因素评分矩阵核对（按分值上限与合计核对矩阵自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** | 质保期与索赔金额核对（按质保期月数与里程、索赔金额算式核对自洽，仅提示差异，不作出定性结论） |  |

</details>

</details>

</details>## License

Apache-2.0. See [LICENSE](./LICENSE) and
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
