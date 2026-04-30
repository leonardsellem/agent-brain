---
title: Live Release E2E Rehearsal
---

# Live Release E2E Rehearsal

## Scope

This rehearsal covers the public live-migration path for disposable Claude Code and Codex roots. It proves the CLI can diagnose explicit roots, import portable source into an Agent Brain repo, dry-run adapter-backed materialization, confirm a fingerprint, snapshot, apply, verify, rollback, explain conflicts, and bootstrap another target root.

Fixture-backed commands remain useful as a safe demo path, but public live-readiness is gated by the live command sequence below.

For the owner's real tracked `.codex`, `.claude`, and `.dotstate` folders, use the stricter [live personal npm E2E protocol](live-personal-npm-e2e-protocol.md). That protocol starts with an npm-installed, Computer Use-visible, non-mutating pass and only allows live mutation after a fresh Ring 2 approval.

## Command Rehearsal

```bash
npm run build
rm -rf tmp/live-claude tmp/live-codex tmp/live-target tmp/live-target-b tmp/agent-brain-live
mkdir -p tmp/live-claude/skills/review tmp/live-codex
printf '# Review\n\nPortable disposable skill.\n' > tmp/live-claude/skills/review/SKILL.md

node dist/cli.js doctor --claude-root tmp/live-claude --codex-root tmp/live-codex --json
node dist/cli.js import --claude-root tmp/live-claude --repo tmp/agent-brain-live --json

DRY_RUN_JSON=$(node dist/cli.js apply --repo tmp/agent-brain-live --target-root tmp/live-target --adapter claude-code --profile profile.default --json)
printf '%s\n' "$DRY_RUN_JSON"
FINGERPRINT=$(printf '%s' "$DRY_RUN_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).findings.find(f=>f.id==="apply.dry-run").provenance.fingerprint))')

APPLY_JSON=$(node dist/cli.js apply --repo tmp/agent-brain-live --target-root tmp/live-target --adapter claude-code --profile profile.default --confirm-fingerprint "$FINGERPRINT" --json)
printf '%s\n' "$APPLY_JSON"
SNAPSHOT=$(printf '%s' "$APPLY_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).findings.find(f=>f.id==="apply.snapshot-created").provenance.snapshotPath))')

node dist/cli.js verify --repo tmp/agent-brain-live --target-root tmp/live-target --adapter claude-code --json
node dist/cli.js rollback --snapshot "$SNAPSHOT" --target-root tmp/live-target --json
node dist/cli.js bootstrap --repo tmp/agent-brain-live --target-root tmp/live-target-b --adapter claude-code --profile profile.default --json
node dist/cli.js explain-conflict 'packages/review/SKILL.md' --json
```

The command sequence extracts the real fingerprint and snapshot path from JSON output. Do not substitute placeholder fingerprints in a confirmed apply.

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
