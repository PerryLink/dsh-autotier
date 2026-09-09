# v0.2 roadmap: concrete designs for the deferred items

This file records the researched, decision-ready design for every capability
that is deliberately **not** in 0.1.x. Each entry states the goal, the exact
mechanism, the acceptance criteria, and why it is not enabled yet. Nothing here
is speculation: the seams named below were read in the harness checkout
(`dsh-v0.1.5-alpha.1-13`).

## 1. Browser half (Settings card + composer pill)

**Status:** implemented on the `v0.2.0` line (client bundle + Typert Remote
`tier/status|setMode|catalog`); see `src/client/`, `src/wire.ts`,
`src/typert.host.ts`.

**Why it was deferred:** the host surface was complete first (`ctx.autotier`),
and the client half needs the browser bundle pipeline (tsdown CJS face wrapped
in `window.__ModuleLoader__.load`), which is a packaging change rather than a
routing change.

## 2. Fingerprint posterior persistence

**Goal:** a restarted harness keeps the per-shape cheap/strong win rates instead
of re-learning from the judge's cold start.

**Mechanism (chosen):** a dedicated settings namespace, not the user-facing
`autotier` one:

```ts
ctx.settings.register('autotier-fingerprints', FingerprintSchema, { applies: 'live' })
```

- `FingerprintSchema` = `{ version: 1, entries: [{ key, cheapOK, cheapN, strongOK, strongN, observations, lastSeen }] }`, capped at the same LRU 2000.
- Writes are **debounced** (≥30 s between flushes and one final flush on
  `ctx.effect` disposal) and use `replace()` on the whole section, so a user
  editing the document cannot produce a partial merge.
- On mount, `PosteriorTable.hydrate(section)` validates and loads; a
  `stateVersion`/`version` mismatch discards the section (the same rule the
  session-projection cache uses).
- A namespace that is absent (a deployment without settings) degrades to the
  current in-memory behaviour — the plugin never depends on persistence.

**Why not the `autotier` namespace:** it is user-facing; writing a large learned
table into it would surface in the Settings card and collide with the user's
revision on every flush. A separate namespace keeps the two concerns apart.

**Acceptance:** a unit test proving hydrate → record → flush → hydrate is
idempotent; an integration test proving a refused settings write leaves the
in-memory table intact.

**Why not enabled yet:** it adds a write path to a plugin whose current promise
is "writes only the `autotier` namespace", and the benefit only appears after a
long enough session history that the cold-start fallback has already paid for
itself. Ship it behind `persistence.fingerprints: false` default.

## 3. Attempt-first middle band (default on)

**Goal:** start ambiguous turns on the cheap tier and escalate on a signal,
which the cascade literature shows is cheaper *and* faster than deciding up
front.

**What is missing is calibration, not code:** the band, its `tauLow`, the
verify-once review, and the effort-first ladder are implemented and tested; the
shipped default is `intent.attemptBand.enabled: false` because the thresholds
have never been measured on real traffic.

**Mechanism:** `scripts/calibrate.mjs` + a 90-case labelled corpus:

- Corpus: `fixtures/intent-corpus.jsonl`, one `{ text, expectedTier, hard }` per
  line, balanced across the eight scenarios (11–12 each) plus 10 adversarial
  "looks simple, is complex" cases.
- The script replays the corpus through the *shipped* classifier (no LLM), then
  sweeps `ruleThreshold`/`tauLow` and prints a table of PGR, APGR, CPT(50 %),
  CPT(80 %), strong-call % and rule-layer hit rate — the same metrics RouteLLM's
  `calibrate_threshold` reports.
- CI gate (a vitest suite over the same corpus): **CPT(80 %) ≤ 40 %**,
  **APGR ≥ 0.7**, routing quality ≥ 95 % of an always-strong oracle, rule-layer
  zero-token hit ≥ 60 %.
- Only when the gate is green does the shipped default flip to
  `attemptBand.enabled: true`.

**Why not enabled yet:** enabling an uncalibrated band would spend strong calls
on turns the rules already classify correctly, which is exactly the cost the
plugin exists to avoid.

## 4. Long-context lane

**Goal:** route very long sessions (est. tokens ≥ 30 k) to a model whose context
window actually fits, instead of failing or compacting mid-turn.

**Mechanism:** the same pre-flight module already answers "does this route
exist"; extend it with `ctx.llm.resolveModelInfo(...).context?.contextWindow`:

- When the assembled request's estimated tokens exceed the target route's
  `contextWindow`, pick the first fallback entry (or the other tier) whose
  window fits, and log the substitution once.
- If nothing fits, leave the route alone — compaction owns that case, and a
  router must not silently drop the user's context.

**Why not yet:** `LlmCallConfig` carries no message payload at the request
waterfall, so the estimate must come from the session's derived history; the
read is cheap but it is a new dependency on `session.deriveMessages()`, and the
harness's own compaction is the primary owner of this problem.

## 5. Multi-router coexistence

**Status:** implemented in 0.1.2 — a foreign `provider/model` at the request
waterfall is detected, logged once per session, and surfaced by `/tier status`
and `tier_status`.

## 6. Explicit user selection

**Status:** implemented in 0.1.2 — the applied tier is mirrored into the
`agent-default-model` document, and an external change to that document moves
every live session to `delegated` until `/tier auto`.
