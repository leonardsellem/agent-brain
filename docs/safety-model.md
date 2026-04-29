# Safety Model

Agent Brain treats live target mutation as a transaction. The tool should make ownership legible before writing, limit every write to an approved plan, and leave the operator with verification results plus rollback metadata.

Read this with the [architecture](architecture.md) and [adapter contract](adapter-contract.md).

## Safety Goals

The safety model protects three things:

- **Portable source.** Human-authored packages and profiles should not be overwritten by generated output.
- **App-owned state.** Native settings, caches, histories, auth material, and local runtime state should not be adopted or mutated casually.
- **Operator recovery.** Every live apply should have a snapshot-backed rollback path.

The default posture is conservative. If Agent Brain cannot explain what owns a path, it should report `unknown` rather than force a merge or import.

## Transaction Lifecycle

Live apply follows this sequence. In the current developer preview, the public CLI proves the sequence against structured fixtures and disposable virtual targets; real app-root mutation remains deferred.

1. Build a dry-run plan with every create, update, move, remove, and symlink change.
2. Compute a fingerprint for that exact dry-run.
3. Require explicit confirmation of the fingerprint before mutation.
4. Capture a baseline snapshot for every path the plan owns.
5. Apply only the paths listed in the dry-run.
6. Verify generated target state against expected output and locks.
7. Retain rollback metadata and report remaining risks.

The fingerprint is a guard against stale approval. If the plan changes, the confirmation must change too.

## Snapshot and Rollback

Snapshots capture the pre-mutation state of owned paths:

| Path state | Snapshot behavior |
| --- | --- |
| Existing file | Store content and metadata needed to restore it. |
| Existing symlink | Store the link target rather than following it blindly. |
| Missing path | Record absence so rollback can remove newly created output. |
| Directory touched by plan | Track owned children rather than treating the whole app root as disposable. |

Rollback should restore from snapshot metadata instead of trying to invert an apply plan. Inverting a plan is fragile when symlinks, partial writes, or external app changes are involved.

## Exclusion Policy

The following are excluded from canonical packages by default:

- Auth files, session stores, tokens, private keys, API keys, and secret-like content.
- Runtime histories, caches, logs, generated schemas, and temporary files.
- Machine-local trust decisions, absolute local paths, and host-specific overrides.
- App-native state whose semantics belong to Claude Code, Codex, or another target.
- Foreign-owned files managed by another tool.
- Unknown files until a human or future rule classifies them.

Explicit override should be rare, provenance-bearing, and visible in reports.

## Operator Checklist

Before using a live app root:

1. Run `agent-brain doctor --fixture tests/fixtures/e2e-persona/scannable.json` and inspect high-severity findings.
2. Run `agent-brain plan --fixture tests/fixtures/e2e-persona/scannable.json` before writing.
3. Write only to an explicit repo destination with `agent-brain import --fixture tests/fixtures/e2e-persona/scannable.json --repo tmp/agent-brain-preview`.
4. Review exclusions, unknowns, shared-root risks, and secret findings.
5. Confirm that the dry-run only touches paths Agent Brain should own.
6. Confirm the exact dry-run fingerprint with `--confirm-fingerprint` only after reviewing the dry-run output.
7. Keep the snapshot location and rollback command visible before apply.
8. Run `agent-brain verify --fixture tests/fixtures/e2e-persona/scannable.json --target-root /synthetic/target` after apply.

The public `apply`, `verify`, and `rollback` commands fail closed when required evidence is missing. A missing target, fixture, fingerprint, lock context, or snapshot metadata should produce an error rather than a reassuring success summary.

If verification reports high-severity drift or missing generated targets, do not treat the apply as complete until the finding is fixed or tracked as real work.

## Conflict Guidance

Conflict explanation follows the same ownership vocabulary:

- Portable source conflicts should be resolved in Agent Brain package or profile files.
- Generated target conflicts should usually be regenerated from canonical intent.
- Runtime, cache, auth, and secret conflicts should not be merged into canonical source.
- Shared-root conflicts indicate topology risk and should be separated before further automation.
- Unknown conflicts require human classification.

## Related Files

- [Architecture](architecture.md)
- [Adapter contract](adapter-contract.md)
- [Agent handoff](agent-handoff.md)
- [Dry-run implementation](../src/apply/dry-run.ts)
- [Snapshot implementation](../src/apply/snapshot.ts)
- [Rollback implementation](../src/apply/rollback.ts)
