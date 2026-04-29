import type { DryRun, VirtualTarget } from "./dry-run.js";

export type SnapshotEntry =
  | { path: string; kind: "file"; content: string }
  | { path: string; kind: "symlink"; target: string }
  | { path: string; kind: "missing" };

export interface Snapshot {
  id: string;
  adapterVersion: string;
  dryRunFingerprint: string;
  entries: SnapshotEntry[];
}

export function createSnapshot(
  target: VirtualTarget,
  dryRun: DryRun,
  adapterVersion: string
): Snapshot {
  const paths = new Set<string>();
  for (const operation of dryRun.operations) {
    paths.add(operation.path);
    if (operation.type === "move") {
      paths.add(operation.to);
    }
  }

  return {
    id: `snap-${dryRun.fingerprint.slice("sha256:".length, "sha256:".length + 12)}`,
    adapterVersion,
    dryRunFingerprint: dryRun.fingerprint,
    entries: [...paths].map((path) => snapshotEntry(target, path))
  };
}

function snapshotEntry(target: VirtualTarget, path: string): SnapshotEntry {
  if (Object.prototype.hasOwnProperty.call(target.files, path)) {
    return {
      path,
      kind: "file",
      content: target.files[path]!
    };
  }

  if (Object.prototype.hasOwnProperty.call(target.symlinks, path)) {
    return {
      path,
      kind: "symlink",
      target: target.symlinks[path]!
    };
  }

  return {
    path,
    kind: "missing"
  };
}
