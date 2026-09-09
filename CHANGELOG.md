# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial plugin skeleton: the `dsh-autotier` function-plugin contract
  (`name`/`inject`/`Config`/`apply`, no default export), the `autotier`
  Schemastery settings namespace with save-time cross-field validation, and the
  `ctx.autotier` status service.
- Configuration schema for tiers (strong/cheap/vision), intent classification
  (thresholds, attempt band, hysteresis, declarative rules, judge, scenarios,
  cost mode), the high-risk guard, failure escalation and the routing mode.
  Reasoning effort accepts exactly the adapter vocabulary
  `off | low | high | max`; the default strong model is `deepseek-v4-pro` and
  the default cheap model is `deepseek-v4-flash`.
- Five-language READMEs, `cordis.patch.yml` with every key documented inline,
  Apache-2.0 license, security policy and third-party notices.
- CI workflows: `ci.yml` (typecheck against the checkout faces, `typecheck:ci`
  against the published `0.1.2-rc.1` faces, tests, build, artifact and
  self-containment verification), `compat.yml` (real profile install,
  `--dump-config` activation assertion, keyless headless smoke, uninstall
  rollback), `release.yml` (npm provenance + GitHub Release), `scorecard.yml`
  and `plugin-doctor.yml`.
- Test suites: config schema and cross-field resolution, function-plugin
  contract, fiber-disposal lifecycle over the real host services, and a real
  Loader composition over a temporary `cordis.yml`.
