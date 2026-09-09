# dsh-autotier

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
| `@deepseek-ai/dsh` `0.1.2-rc.1` | compatible (this is what CI type-checks and the compat workflow installs) |
| `0.1.3-alpha.1` and later `0.1.x` lines | compatible; the local `typecheck` resolves the checkout's type faces |
| `@deepseek-ai/cordis` `^4.0.2`, `@deepseek-ai/schemastery` `^3.18.2` | peer baseline |

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
- **Session log** — routing decisions and guard denials are appended as
  ordinary session events on harness lines that still accept plugin events; on
  `0.1.2-alpha.1` and later the vocabulary is fail-closed, so the trail degrades
  to the plugin logger and the `autotier/tier-changed` event.
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
- **No Settings card or composer pill yet.** Routing is fully automatic and the
  host surface (`ctx.autotier.status()` / `catalog()`, `/tier`, `tier_status`,
  `tier_route`) is complete; the browser half that renders a Settings tab and a
  composer tier pill is planned for v0.2.
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
pnpm run typecheck:ci   # against the published 0.1.2-rc.1 faces (what CI runs)
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

## License

Apache-2.0. See [LICENSE](./LICENSE) and
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
