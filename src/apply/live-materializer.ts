import { mkdirSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DryRun } from "./dry-run.js";
import type { Snapshot } from "./snapshot.js";
import { resolveContainedPath } from "../core/path-safety.js";

export interface LiveApplyResult {
  changedPaths: string[];
}

export function applyLiveDryRun(
  targetRoot: string,
  dryRun: DryRun,
  confirmationFingerprint: string
): LiveApplyResult {
  if (confirmationFingerprint !== dryRun.fingerprint) {
    throw new Error("confirmation fingerprint does not match dry run");
  }

  const changedPaths: string[] = [];

  for (const operation of dryRun.operations) {
    if (operation.type === "create" || operation.type === "update") {
      const destination = resolveContainedPath(targetRoot, operation.path);
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, operation.content);
      changedPaths.push(destination);
    } else if (operation.type === "move") {
      const from = resolveContainedPath(targetRoot, operation.path);
      const to = resolveContainedPath(targetRoot, operation.to);
      mkdirSync(path.dirname(to), { recursive: true });
      renameSync(from, to);
      changedPaths.push(from, to);
    } else {
      const destination = resolveContainedPath(targetRoot, operation.path);
      mkdirSync(path.dirname(destination), { recursive: true });
      try {
        unlinkSync(destination);
      } catch {
        // Missing links are fine for create-style symlink operations.
      }
      symlinkSync(operation.to, destination);
      changedPaths.push(destination);
    }
  }

  return { changedPaths };
}

export function restoreLiveSnapshot(targetRoot: string, snapshot: Snapshot): LiveApplyResult {
  const changedPaths: string[] = [];

  for (const entry of snapshot.entries) {
    const destination = resolveContainedPath(targetRoot, entry.path);
    if (entry.kind === "file") {
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, entry.content);
    } else if (entry.kind === "symlink") {
      mkdirSync(path.dirname(destination), { recursive: true });
      try {
        unlinkSync(destination);
      } catch {
        // Missing paths are fine when restoring a symlink.
      }
      symlinkSync(entry.target, destination);
    } else {
      rmSync(destination, { recursive: true, force: true });
    }
    changedPaths.push(destination);
  }

  return { changedPaths };
}
