# Third-party notices

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

The read-only reference checkout used for the port lives outside this repository
and is never shipped.
