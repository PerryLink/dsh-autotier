# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately through GitHub's private vulnerability reporting:

**https://github.com/PerryLink/dsh-autotier/security/advisories/new**

That flow keeps the report confidential while we triage, and it is the channel we
watch first.

## Before you report

- **Redact sensitive data** from any logs, session excerpts, or config files you
  attach: tokens, API keys, secrets, webhook URLs with credentials,
  Authorization headers, personal paths, and account identifiers.
- Include, when possible: the plugin version, the harness (`dsh`) version, Node
  and OS versions, and the minimal steps to reproduce.

## What to expect

- **Acknowledgment**: within 5 business days.
- **Assessment**: we reproduce and classify the report, then tell you whether it
  is a vulnerability in this plugin, in the harness, or a configuration issue.
- **Fix**: security fixes ship as a patch release with a CHANGELOG entry; we
  credit reporters who ask to be credited.

## Scope

In scope:

- The high-risk guard bypassing or weakening a denial it claims to enforce.
- A routing decision that silently sends data to an unintended provider.
- Credential or secret leakage through logs, events, or the settings namespace.
- A listener, tool, command or settings namespace surviving plugin disposal.

Out of scope:

- The guard not knowing a destructive command you did not configure. The guard is
  defence in depth and never replaces `dsh-defend`, the approval service, or the
  sandbox policy.
- Denial-of-service through a deliberately hostile settings document; invalid
  values fail loudly at load time by design.
- Vulnerabilities in the harness itself — report those to
  <https://github.com/deepseek-ai/deepseek-harness/security>.

## Hardening advice

- Keep `dsh-defend`, the approval service and the sandbox policy enabled.
- Review `guard.protectedPaths` for your own workspace and add the paths whose
  modification should always be reviewed on the strong tier.
- Use `/tier off` to disable routing entirely if you need the pre-install
  behavior.
