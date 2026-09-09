/**
 * High-impact command and path rules for the autotier guard.
 *
 * A TypeScript port of the dependency-free rule logic in `lib/pure.js` of
 * `dsh-tier-router` (v0.5.0, MIT — see `THIRD_PARTY_NOTICES.md`): the
 * `ARG_RUNNERS`/`DIRECT_RUNNERS` command-position detection, the 16
 * `HIGH_IMPACT_COMMAND` patterns, and the 5 `HIGH_IMPACT_PATH` patterns. The
 * upstream matching order, case-insensitivity, anchored command position, and
 * 80/120-character truncation are preserved exactly; the port only adds stable
 * rule ids and the `GuardMatch` shape the guard layer consumes.
 *
 * INTENTIONAL DELTA OVER UPSTREAM (the plugin's own Apache-2.0 addition, not
 * upstream code): upstream never looks inside a `sh -c "..."` payload, so
 * `sh -c "rm -rf /"` is a documented false negative. {@link SHELL_WRAPPERS} and
 * {@link SHELL_WRAPPER_MAX_DEPTH} add a second pass that runs only after the
 * upstream rules return no match: it strips a leading command runner, extracts
 * the `-c` payload (single-dash flag clusters such as `-lc`, case-insensitive
 * wrapper names, and the optional backslash escape included), unescapes it, and
 * re-runs the same matcher on it (bounded by depth) under a
 * `shell-wrapper:<inner rule>` id. No upstream verdict changes.
 *
 * Matching is deliberately conservative: it is a review/escalation signal, never
 * a substitute for `dsh-defend`, approvals, or the sandbox policy.
 * @module dsh-autotier/guard-rules
 */

/**
 * Command runners that may prefix `rm` and still execute it, split by whether
 * they legitimately carry their own arguments before the command.
 *
 * `ARG_RUNNERS` allow any arguments before `rm` (`env -i rm -rf`,
 * `timeout 5 rm -rf`, `xargs -0 rm -rf`); `DIRECT_RUNNERS` take the command
 * immediately (`nohup rm -rf`), because allowing arguments there would
 * false-positive on harmless forms like `nohup echo rm -rf`.
 */
const ARG_RUNNERS = 'sudo|env|timeout|nice|xargs|doas|setarch|stdbuf|ionice'
const DIRECT_RUNNERS = 'command|exec|busybox|nohup|pkexec'

/**
 * `rm` at command position: start of string, after a command separator
 * (`;`, `&`, `|`), or after one of the runners above. `\\?` makes the leading
 * backslash escape (`\rm -rf`) optional rather than required.
 */
const RECURSIVE_FORCE_RM = new RegExp(
  '(^|[;&|]\\s*' +
    '|\\b(' + ARG_RUNNERS + ')\\s+(?:\\S+\\s+)*' +
    '|\\b(' + DIRECT_RUNNERS + ')\\s+' +
    ')\\\\?rm(\\s+)',
  'i',
)

/** Command matches are trimmed and truncated to this many characters. */
const COMMAND_MATCH_LIMIT = 80

/** Path matches are truncated to this many characters (upstream: whole path). */
const PATH_MATCH_LIMIT = 120

/**
 * Shell wrappers whose `-c` payload must be re-scanned (upstream misses these).
 * This table and {@link SHELL_WRAPPER_MAX_DEPTH} are the plugin's own extension,
 * not part of the upstream rule port.
 */
export const SHELL_WRAPPERS: readonly string[] = ['sh', 'bash', 'zsh', 'dash', 'ksh']

/** Recursion depth bound for nested `sh -c "sh -c ..."` payloads. */
export const SHELL_WRAPPER_MAX_DEPTH = 3

/**
 * The wrapper-name alternation in every letter case (`SH`, `Bash`, `sh`, ...)
 * WITHOUT making the flag cluster case-insensitive: `-C` must not count as a
 * `-c` cluster.
 */
const WRAPPER_NAMES = SHELL_WRAPPERS
  .map((word) => word.split('').map((letter) => `[${letter}${letter.toUpperCase()}]`).join(''))
  .join('|')

/**
 * A wrapper invocation at command position: separator/start, an optional
 * backslash escape, wrapper name (any letter case), a single-dash flag cluster
 * containing `c` (`-c`, `-lc`, `-ec`, ... but never a long option such as
 * `--command`, which has no single-dash cluster before the payload), then a
 * double-quoted, single-quoted, or bare payload. The quoted forms accept
 * backslash escapes so nested quoting survives; the captured content is
 * unescaped before it is re-scanned.
 */
const SHELL_WRAPPER_C = new RegExp(
  `(^|[;&|]\\s*)\\\\?(${WRAPPER_NAMES})\\s+-(?=[a-z]*c[a-z]*\\b)[a-z]+\\s+("((?:[^"\\\\]|\\\\.)*)"|'((?:[^'\\\\]|\\\\.)*)'|(\\S+))`,
)

/** A command runner at the very start, with optional backslash escape. */
const RUNNER_AT_START = new RegExp(`^\\s*\\\\?(${ARG_RUNNERS}|${DIRECT_RUNNERS})\\s+`)

/** An argument-carrying runner at the very start. */
const ARG_RUNNER_AT_START = new RegExp(`^\\s*\\\\?(${ARG_RUNNERS})\\s+`)

/** One leading whitespace-delimited token. */
const LEADING_TOKEN = /^(\S+)\s+/

/** One named high-impact rule. */
export interface GuardRule {
  /** Stable kebab-case identifier, also reported in {@link GuardMatch.rule}. */
  readonly id: string
  /** Human-readable description of the destruction the rule protects against. */
  readonly description: string
  /** The upstream pattern, unchanged (no `g` flag, so matching is stateless). */
  readonly pattern: RegExp
}

/** A matched rule plus the exact text that matched. */
export interface GuardMatch {
  /** The {@link GuardRule.id} that matched, or `shell-wrapper:<inner rule>`. */
  readonly rule: string
  /** The matched rule's description. */
  readonly description: string
  /**
   * The matched text: for commands the matched substring trimmed and truncated
   * to 80 characters; for paths the whole target path truncated to 120
   * characters (upstream reports the path, not the regex substring).
   */
  readonly matched: string
}

/**
 * The 16 upstream `HIGH_IMPACT_COMMAND` patterns, in upstream array order.
 * `matchCommand` returns the first hit, so order is part of the contract:
 * `sudo` precedes `wget-pipe-shell`, and the separate `rm` rule precedes all
 * of these.
 */
export const HIGH_IMPACT_COMMAND_RULES: readonly GuardRule[] = [
  { id: 'mkfs', description: 'mkfs: filesystem creation on a device', pattern: /\bmkfs\.?[a-z]*\b/ },
  { id: 'dd-write', description: 'dd with if=/of=: raw device read/write', pattern: /\bdd\s+(if|of)=/ },
  { id: 'sudo', description: 'sudo: privilege escalation at command position', pattern: /(^|[;&|]\s*)sudo\b/ },
  { id: 'shutdown', description: 'shutdown/reboot/halt: system power control', pattern: /(^|[;&|]\s*)(shutdown|reboot|halt)\b/ },
  { id: 'git-push-force', description: 'git push --force/-f: remote history rewrite', pattern: /git\s+push\s+[^\n]*(-f\b|--force)/ },
  { id: 'git-clean-force', description: 'git clean -f: untracked file deletion', pattern: /git\s+clean\s+(-[a-z]*f[a-z]*\b)/ },
  { id: 'find-delete', description: 'find -delete: recursive file deletion', pattern: /find\s+[^\n]*\s+-delete\b/ },
  { id: 'find-exec-rm', description: 'find -exec rm: deletion through find', pattern: /find\s+[^\n]*-exec\s+[^\n]*\brm\b/ },
  { id: 'shutil-rmtree', description: 'shutil.rmtree(...): recursive Python deletion', pattern: /\b(shutil\.rmtree|rmtree)\s*\(/ },
  { id: 'os-remove', description: 'os.remove(...): Python file deletion', pattern: /\bos\.remove\s*\(/ },
  { id: 'python-inline-delete', description: 'python -c with inline deletion', pattern: /python[0-9.]*\s+-c\s+[^|;&\n]*(rmtree|os\.remove|shutil\.rmtree|rm\s+-rf)/ },
  { id: 'curl-pipe-shell', description: 'curl | sh: remote script execution', pattern: /curl\s+[^\n]*\|\s*(sudo\s+)?(ba)?sh\b/ },
  { id: 'wget-pipe-shell', description: 'wget | sh: remote script execution', pattern: /wget\s+[^\n]*\|\s*(sudo\s+)?(ba)?sh\b/ },
  { id: 'chmod-ssh', description: 'chmod on a .ssh/ path: SSH key permission change', pattern: /\bchmod\s+[0-7]{3,4}\s+[^\n]*\.ssh\// },
  { id: 'chown', description: 'chown: ownership change', pattern: /\bchown\s/ },
  { id: 'diskutil-erase', description: 'diskutil erase/unmount: macOS disk destruction', pattern: /\bdiskutil\s+(eraseDisk|eraseVolume|zeroDisk|secureErase|unmountDisk)\b/ },
]

/**
 * The 5 upstream `HIGH_IMPACT_PATH` patterns (credentials, keys, secrets), in
 * upstream array order. `.env` matches unless the suffix is an
 * example/sample/template name.
 */
export const HIGH_IMPACT_PATH_RULES: readonly GuardRule[] = [
  { id: 'dotenv', description: '.env secrets file (example/sample/template names excluded)', pattern: /(^|\/)\.env(\.(?!example|sample|template)[^/]*)?$/i },
  { id: 'credentials', description: 'credentials/secrets file or directory', pattern: /(^|\/)(credentials?|secrets?)(\.(json|ya?ml|toml|ini|env|key|pem|txt))?($|\/)/i },
  { id: 'ssh-dir', description: '.ssh/ directory', pattern: /(^|\/)\.ssh\// },
  { id: 'private-key', description: 'id_rsa/id_ed25519/id_ecdsa/id_dsa key or .netrc', pattern: /(^|\/)(id_(rsa|ed25519|ecdsa|dsa)|\.netrc)(\b|\/)/i },
  { id: 'key-file', description: '.pem/.key/.p12/.pfx/.jks key material', pattern: /\.(pem|key|p12|pfx|jks)$/i },
]

/** Description reported for the separate recursive-force `rm` rule. */
const RM_RECURSIVE_FORCE_DESCRIPTION = 'command pattern rm -r/-f matched (recursive force delete)'

/**
 * Match `rm` at command position with BOTH recursive (`-r`/`-R`/`--recursive`)
 * and force (`-f`/`--force`) flags, including split flags (`rm -r -f`) that a
 * single-token check misses.
 * @param command - one shell command string.
 * @returns the matched command-position text (trimmed, truncated), or null.
 */
function matchRecursiveForceRm(command: string): string | null {
  const separator = command.match(RECURSIVE_FORCE_RM)
  if (separator === null) return null
  const head = separator[0] ?? ''
  const rest = command.slice((separator.index ?? 0) + head.length)
  let flags = ''
  for (const token of rest.split(/\s+/)) {
    if (/^--?[a-zA-Z]/.test(token)) flags += token.replace(/^-+/, '')
    else break
  }
  const lowered = flags.toLowerCase()
  if (!lowered.includes('r') || !lowered.includes('f')) return null
  return head.trim().slice(0, COMMAND_MATCH_LIMIT)
}

/**
 * Match the upstream command rules only: the recursive-force `rm` rule first
 * (upstream order), then {@link HIGH_IMPACT_COMMAND_RULES} in array order.
 */
function matchUpstreamCommand(command: string): GuardMatch | null {
  const rm = matchRecursiveForceRm(command)
  if (rm !== null) {
    return { rule: 'rm-recursive-force', description: RM_RECURSIVE_FORCE_DESCRIPTION, matched: rm }
  }
  for (const rule of HIGH_IMPACT_COMMAND_RULES) {
    const match = command.match(rule.pattern)
    if (match !== null) {
      return {
        rule: rule.id,
        description: rule.description,
        matched: (match[0] ?? '').trim().slice(0, COMMAND_MATCH_LIMIT),
      }
    }
  }
  return null
}

/**
 * Strip leading command runners (and the arguments an argument-carrying runner
 * may carry) so a `sh -c ...` behind `env -i`, `timeout 5`, or `nohup` is still
 * seen at command position. Argument consumption stops at a shell wrapper,
 * matched case-insensitively and with the optional backslash escape removed.
 */
function stripRunnerPrefix(command: string): string {
  let rest = command
  for (;;) {
    const carriesArgs = ARG_RUNNER_AT_START.test(rest)
    const runner = RUNNER_AT_START.exec(rest)
    if (runner === null) return rest
    rest = rest.slice((runner[0] ?? '').length)
    if (!carriesArgs) continue
    for (;;) {
      const token = LEADING_TOKEN.exec(rest)
      const word = (token?.[1] ?? '').replace(/^\\/, '').toLowerCase()
      if (token === null || SHELL_WRAPPERS.includes(word)) break
      rest = rest.slice((token[0] ?? '').length)
    }
  }
}

/** The `-c` payload of the first shell-wrapper invocation, or null. */
function matchShellWrapperPayload(command: string): string | null {
  const wrapper = SHELL_WRAPPER_C.exec(stripRunnerPrefix(command))
  if (wrapper === null) return null
  const payload = wrapper[4] ?? wrapper[5] ?? wrapper[6] ?? ''
  return payload.replace(/\\(["'\\])/g, '$1')
}

/**
 * The full matcher: upstream rules first, then the bounded shell-wrapper
 * extension. `depth` counts wrapper unwrappings, so a payload nested deeper
 * than {@link SHELL_WRAPPER_MAX_DEPTH} is left unmatched.
 */
function matchCommandAtDepth(command: string, depth: number): GuardMatch | null {
  const upstream = matchUpstreamCommand(command)
  if (upstream !== null) return upstream
  if (depth >= SHELL_WRAPPER_MAX_DEPTH) return null
  const payload = matchShellWrapperPayload(command)
  if (payload === null) return null
  const inner = matchCommandAtDepth(payload, depth + 1)
  if (inner === null) return null
  return {
    rule: `shell-wrapper:${inner.rule}`,
    description: `shell wrapper -c payload: ${inner.description}`,
    matched: inner.matched.slice(0, COMMAND_MATCH_LIMIT),
  }
}

/**
 * True for `rm` with BOTH recursive and force flags at command position (split
 * flags included). Prose (`echo rm -rf`) and runner-argument false positives
 * (`nohup echo rm -rf`) stay unmatched. Upstream-exact: this never unwraps a
 * shell wrapper.
 */
export function hasRecursiveForceRm(command: string): boolean {
  return matchRecursiveForceRm(command) !== null
}

/**
 * Match one shell command string against the recursive-force `rm` rule first
 * (upstream order) and then the command rules in array order; only when those
 * find nothing, re-scan a `sh -c`-style payload (see the module header delta).
 * @param command - one shell command string.
 * @returns the first match, or null when the command is not high impact.
 */
export function matchCommand(command: string): GuardMatch | null {
  return matchCommandAtDepth(command, 0)
}

/**
 * Match one file path (a write/edit target) against the path rules in array
 * order.
 * @param filePath - one target path.
 * @returns the first match, or null when the path is not high impact.
 */
export function matchPath(filePath: string): GuardMatch | null {
  const rule = HIGH_IMPACT_PATH_RULES.find((candidate) => candidate.pattern.test(filePath))
  if (rule === undefined) return null
  return {
    rule: rule.id,
    description: rule.description,
    matched: filePath.slice(0, PATH_MATCH_LIMIT),
  }
}

/**
 * Credential/secret path classification for protected-path review: true when
 * any of the {@link HIGH_IMPACT_PATH_RULES} matches, i.e. exactly the paths
 * {@link matchPath} reports.
 */
export function isCredentialPath(filePath: string): boolean {
  return HIGH_IMPACT_PATH_RULES.some((rule) => rule.pattern.test(filePath))
}
