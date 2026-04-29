---
title: Release E2E Rehearsal Runbook
---

# Release E2E Rehearsal Runbook

This runbook captures the release rehearsal protocol for Agent Brain. It is written for an agent acting as a real target user, not as a maintainer with private implementation knowledge.

## Persona

The rehearsal persona is a power individual with valuable but messy Claude Code and Codex state:

- Authored skills, prompts, hooks, and MCP-like configuration that should be portable.
- Shared physical roots between apps that could confuse ownership.
- Generated target files that should be reproducible from Agent Brain, not imported as source.
- Runtime histories, caches, auth material, and local overrides that must stay out of canonical packages.
- A strong safety expectation: before any live mutation, the tool must explain ownership, show a dry-run fingerprint, snapshot the baseline, verify the result, and make rollback concrete.

The persona judges the product from the README and CLI output first. Source and tests can explain gaps only after the user-facing behavior is observed.

## Evidence Protocol

Raw terminal logs, screenshots, and other captures belong under `artifacts/e2e-release-rehearsal/`. That directory is gitignored and must not be linked from published docs.

Durable release notes and sanitized findings belong in `docs/release-e2e-findings.md`. Synthetic fixtures live under `tests/fixtures/e2e-persona/`. README-ready images, if any are selected, live under `docs/assets/e2e/` and use repo-relative links.

No raw capture, docs asset, fixture, or published doc may include private absolute paths, local file URI schemes, tokens, auth material, account identifiers, or content copied from real app homes.

## Finding Taxonomy

Findings use these categories:

- `bug`: behavior is wrong or fails unexpectedly.
- `friction`: behavior works but makes the user slow, uncertain, or likely to make mistakes.
- `trust gap`: the product claims safety or clarity without enough evidence for a cautious user.
- `docs gap`: README or companion docs under-explain, over-promise, or omit a needed next step.
- `product gap`: an important user journey is not available through the product surface yet.
- `release-positioning gap`: the product can be valuable, but its public status needs narrower language.
- `polish`: output, naming, formatting, or terminal UX could be clearer.

Severity levels are `release blocker`, `high`, `medium`, and `low`. Severity is based on release impact, not implementation effort.

## Safety Boundary

Real Claude Code and Codex homes are read-only inspiration only. They are not fixtures and must not be mutated during this rehearsal.

If outside-repo content is useful, rewrite it as a sanitized synthetic fixture in this repo. If it cannot be safely rewritten, exclude it from the rehearsal evidence.

Live target mutation is out of scope unless a later user approval names the exact target and dry-run. This rehearsal uses synthetic fixtures and disposable virtual targets only.

For the stricter npm-installed journey against real tracked personal roots, use the [live personal npm E2E protocol](live-personal-npm-e2e-protocol.md). It keeps Ring 1 non-mutating and requires fresh owner approval before any Ring 2 live mutation.

## Mission Script

1. Follow `README.md` as a fresh user.
2. Discover the CLI through `--help` and command-specific help.
3. Try the public fixture-backed commands from README: `doctor --fixture`, `plan --fixture`, `import --fixture --repo`, `apply --fixture --target-root`, `verify --fixture --target-root`, missing-metadata `rollback`, and quoted `explain-conflict` paths.
4. Compare public CLI behavior with fixture-backed behavior from tests and source.
5. Probe ownership language for portable source, generated targets, runtime/cache, auth/secret, local-only, foreign-owned, and unknown material.
6. Probe safety language for dry-run, fingerprint confirmation, snapshot, verify, and rollback.
7. Use Computer Use with Ghostty for a human-visible terminal pass when helpful.
8. Triage findings by release impact and leave a verdict.

## Artifact Hygiene

Before handoff, run a local-path scan across tracked docs and fixtures for private absolute path markers, private brain-vault markers, and local file URI schemes. Keep the concrete matcher in the terminal command or verification notes rather than embedding those forbidden strings in publishable docs.

The scan must return no publishability leaks.

## Regression Command Set

Run these after `npm run build`:

```bash
node dist/cli.js --help
node dist/cli.js doctor --fixture tests/fixtures/e2e-persona/scannable.json
node dist/cli.js plan --fixture tests/fixtures/e2e-persona/scannable.json --json
node dist/cli.js import --fixture tests/fixtures/e2e-persona/scannable.json --repo tmp/agent-brain-preview
node dist/cli.js apply --fixture tests/fixtures/e2e-persona/scannable.json --target-root /synthetic/target --json
node dist/cli.js verify --fixture tests/fixtures/e2e-persona/scannable.json --target-root /synthetic/target --json
node dist/cli.js rollback --json
node dist/cli.js explain-conflict '~/.codex/history.jsonl'
```
