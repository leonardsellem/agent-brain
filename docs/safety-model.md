# Safety Model

Agent Brain treats live target mutation as a transaction.

## Apply Sequence

1. Build a dry-run plan with every create, update, move, and symlink change.
2. Compute a fingerprint for that exact dry-run.
3. Require explicit confirmation of the fingerprint.
4. Capture a baseline snapshot before mutation.
5. Apply only the paths listed in the dry-run.
6. Verify target state.
7. Keep rollback metadata.

## Snapshot Scope

Snapshots capture original file content, symlink targets, and missing paths for every path the apply plan owns. Rollback restores from snapshot metadata rather than inverting the apply plan.

## Exclusions

Runtime state, caches, auth material, secret-like content, and machine-local overrides are excluded from canonical source by default.
