import type { DryRun, VirtualTarget } from "./dry-run.js";
import { createSnapshot } from "./snapshot.js";
import type { Snapshot } from "./snapshot.js";

export interface ApplyResult {
  snapshot: Snapshot;
}

export function applyWithSnapshot(
  target: VirtualTarget,
  dryRun: DryRun,
  confirmationFingerprint: string,
  adapterVersion: string
): ApplyResult {
  const snapshot = createSnapshot(target, dryRun, adapterVersion);
  applyDryRun(target, dryRun, confirmationFingerprint);
  return { snapshot };
}

export function applyDryRun(
  target: VirtualTarget,
  dryRun: DryRun,
  confirmationFingerprint: string
): void {
  if (confirmationFingerprint !== dryRun.fingerprint) {
    throw new Error("confirmation fingerprint does not match dry run");
  }

  for (const operation of dryRun.operations) {
    if (operation.type === "create" || operation.type === "update") {
      target.files[operation.path] = operation.content;
      delete target.symlinks[operation.path];
    } else if (operation.type === "move") {
      if (Object.prototype.hasOwnProperty.call(target.files, operation.path)) {
        target.files[operation.to] = target.files[operation.path]!;
        delete target.files[operation.path];
      }
      if (Object.prototype.hasOwnProperty.call(target.symlinks, operation.path)) {
        target.symlinks[operation.to] = target.symlinks[operation.path]!;
        delete target.symlinks[operation.path];
      }
    } else {
      target.symlinks[operation.path] = operation.to;
      delete target.files[operation.path];
    }
  }
}
