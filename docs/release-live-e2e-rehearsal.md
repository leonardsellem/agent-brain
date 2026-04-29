---
title: Live Release E2E Rehearsal
---

# Live Release E2E Rehearsal

## Scope

This rehearsal covers the public live-migration path for disposable Claude Code and Codex roots. It proves the CLI can diagnose explicit roots, import portable source into an Agent Brain repo, dry-run adapter-backed materialization, confirm a fingerprint, snapshot, apply, verify, rollback, explain conflicts, and bootstrap another target root.

Fixture-backed commands remain useful as a safe demo path, but public live-readiness is gated by the live command sequence below.

## Command Rehearsal

```bash
npm run build
node dist/cli.js doctor --claude-root tmp/live-claude --codex-root tmp/live-codex --source-root tmp/live-source --json
node dist/cli.js import --source-root tmp/live-source --repo tmp/agent-brain-live --json
node dist/cli.js apply --repo tmp/agent-brain-live --target-root tmp/live-target --adapter claude-code --profile profile.default --json
node dist/cli.js apply --repo tmp/agent-brain-live --target-root tmp/live-target --adapter claude-code --profile profile.default --confirm-fingerprint sha256:from-dry-run --json
node dist/cli.js verify --repo tmp/agent-brain-live --target-root tmp/live-target --adapter claude-code --json
node dist/cli.js rollback --snapshot tmp/agent-brain-live/.agent-brain/snapshots/snap-from-dry-run.json --target-root tmp/live-target --json
node dist/cli.js bootstrap --repo tmp/agent-brain-live --target-root tmp/live-target-b --adapter claude-code --profile profile.default --json
node dist/cli.js explain-conflict 'packages/review/SKILL.md' --json
```

The confirmation and snapshot names above are placeholders in documentation; the tested flow extracts the real fingerprint and snapshot path from JSON output.

## Requirement Trace

R1-R2 are covered by repo reader, package/profile intent, and adapter materialization targets. R3-R8 are covered by live diagnosis, source detection, import content fidelity, exclusions, and secret rejection. R9-R13 are covered by live dry-run, fingerprint confirmation, baseline snapshots, materialization locks, verification, and rollback. R14-R15 are covered by lock-aware sync status and conflict explanation. R16-R19 are covered by bootstrap plus Claude Code and Codex adapter contracts.

Acceptance examples AE1-AE5 map to shared-root diagnosis, runtime/auth/local exclusion, live apply with snapshot/verify/rollback, semantic conflict explanation, and second-machine bootstrap.

## Safety Evidence

- Live diagnosis uses explicit roots and remains read-only.
- Import writes only under an explicit Agent Brain repo destination.
- Apply requires a dry-run fingerprint before mutation.
- Snapshot metadata is written before live target writes.
- Materialization locks record generated target ownership.
- Verify reports missing or drifted generated output from the lock.
- Rollback restores file, symlink, and missing states from snapshot metadata.
- Bootstrap materializes a new target from repo intent without copying original app homes.

## Remaining Release Checks

- Run the full verification loop before public release: `npm test`, `npm run typecheck`, `npm run build`, and `npm audit --audit-level=moderate`.
- Keep examples on disposable roots unless a user explicitly chooses real app roots.
- Do not publish screenshots or logs containing private paths, tokens, auth files, histories, or machine-local overrides.
