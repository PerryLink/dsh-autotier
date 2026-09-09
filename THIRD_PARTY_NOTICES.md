# Third-party notices

## zod (https://github.com/colinhacks/zod)

The `tier` Remote wire codecs (`src/wire.ts`) are zod v4 schemas. `zod` is a
declared runtime dependency (MIT) and its library code is inlined into the built
`lib/index.js`, `lib/typert.host.js` and `lib/client.js` bundles; no zod source
is modified.

```
MIT License

Copyright (c) 2020 Colin McDonnell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## dsh-tier-router (`lib/pure.js`)

The high-risk command guard in `src/guard-rules.ts` is a port of the rule table
in `lib/pure.js` from
[dsh-tier-router](https://github.com/BruceLanLan/dsh-tier-router) (v0.5.0),
licensed **MIT**:

```
MIT License

Copyright (c) 2026 BruceLanLan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The port keeps the upstream command/path vocabulary and pattern semantics and
adds: tier-conditional enforcement (the guard protects the cheap tier only), a
configurable whitelist, `guard.protectedPaths` review escalation, and a
structured denial reason. No upstream file is bundled verbatim; the port is
annotated per module with the source file and version.

### Deliberate deltas over upstream

These are this plugin's own additions (Apache-2.0), not upstream code:

1. **Shell-wrapper re-scan.** Upstream misses `sh -c "rm -rf /"` (the payload is
   quoted, so the command-position anchor never sees `rm`). `matchCommand` first
   applies the upstream rules unchanged, then re-scans the `-c` payload of
   `sh|bash|zsh|dash|ksh` (including combined flag clusters such as `-lc`,
   case-insensitive names, an optional leading backslash, and a preceding runner
   with its own arguments), bounded to three nesting levels. An inner match is
   reported as `shell-wrapper:<inner rule id>`. `hasRecursiveForceRm` itself
   stays byte-for-byte upstream, and the upstream false negative is asserted in
   the test suite as a documented regression.
2. **Fallback classification split.** Upstream's `classifyFallback` tri-state is
   split into `permanent`/`transient`/`ignore`/`unknown` so the request-error
   handler can honour its division of labour with `dsh-llm-retry` (permanent
   codes switch the chain immediately; transient codes wait for retry
   exhaustion).
3. **Effort vocabulary.** Upstream's `['medium', 'high', 'max']` ladder is
   replaced by the adapter-owned `off | low | high | max`; `medium` does not
   exist on this host and would fail every request.

The read-only reference checkout used for the port lives outside this repository
and is never shipped.
