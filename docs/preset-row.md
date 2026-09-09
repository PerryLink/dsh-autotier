# Optional preset prompt section

`dsh-autotier` is a **host-plane** plugin: the profile row applies to every
session and routing works with no preset change. This page is for users who want
the model to *know* which tier it is running on.

## Why this is optional

The host row is registered on the root scope, so it covers every agent,
including subagents, without touching any preset. A preset section only adds
model-facing text — it never changes routing, and the plugin works correctly
when the section is absent (`/tier status` reports `prompt-section: absent`).

This is deliberate: shipping a preset with the package would freeze a snapshot
of the host's `standard` preset and drift on every harness release.

## The row

Add one row to **your own** agent preset's `cordis.patch.yml` (the file that
declares the preset's plugin rows):

```yaml
- insert:
    - id: autotier-prompt
      name: '@deepseek-ai/dsh-system-prompt'
      config:
        sections:
          - name: autotier
            text: |-
              You are running under dsh-autotier routing. The active tier is
              chosen per turn: complex work is planned on the strong tier and
              implemented on the cheap tier; simple work runs on the cheap tier
              throughout. If a tool call is denied by the high-risk guard, do not
              retry it — report what you were about to do and let the tier
              escalate.
```

The exact `sections` shape is owned by the host `system-prompt` package; if your
harness version expects a different key, follow the error the Loader prints —
the plugin itself does not depend on this row.

## Verifying it took effect

`/tier status` prints the live routing state; the optional section itself is
visible in the assembled system prompt, not in `/tier` output. If you rename the
section, keep the name `autotier` so you can find it in the prompt.

## Per-preset isolation

If you want a preset to opt out of routing entirely, compose the plugin inside
an `isolate` realm instead of the root scope:

```yaml
- isolate:
    autotier: true
  insert:
    - id: autotier
      name: dsh-autotier
```

A realm-isolated row only affects the sessions of that preset.
