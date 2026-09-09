# Supporting lanes: compaction and title generation

`dsh-autotier` routes **conversation requests** — the ones the agent loop
assembles for a turn. Two other host seams make their own model calls and are
deliberately left alone:

| Lane | Host seam | Owner package |
|---|---|---|
| Context compaction | its own model settings | `@deepseek-ai/dsh-compaction` |
| Session titles | its own model settings | `@deepseek-ai/dsh-session-title-llm` |

Routing them from here would be wrong twice over: they are not turn-scoped, so a
per-turn tier decision does not apply, and rewriting their calls would surprise a
user who configured them explicitly.

## Aligning their cost profile

If you want the whole harness to sit on the cheap model, point each lane's own
configuration at the same landing as `tiers.cheap`:

```yaml
- insert:
    - id: compaction
      name: '@deepseek-ai/dsh-compaction'
      config:
        provider: deepseek-official
        model: deepseek-v4-flash
        reasoningEffort: low

    - id: session-title-llm
      name: '@deepseek-ai/dsh-session-title-first-prompt-llm'
      config:
        provider: deepseek-official
        model: deepseek-v4-flash
```

The key names above are the host packages' own; check the installed version's
schema if a row is rejected. `dsh-autotier` never writes these rows.

## Judge calls

The low-confidence judge uses `intent.judge.model` (or the first catalog model
whose id contains `flash`) through the ordinary `ctx.llm` path. It is a separate,
short request with its own `maxTokens` and `timeoutMs`, so it never inherits a
tier's landing — pin it to a cheap model on purpose.
