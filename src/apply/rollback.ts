import type { VirtualTarget } from "./dry-run.js";
import type { Snapshot } from "./snapshot.js";

export interface RollbackResult {
  restored: string[];
  failed: Array<{ path: string; reason: string }>;
}

export function rollbackSnapshot(target: VirtualTarget, snapshot: Snapshot): RollbackResult {
  const restored: string[] = [];
  const failed: Array<{ path: string; reason: string }> = [];

  for (const entry of snapshot.entries) {
    try {
      if (entry.kind === "file") {
        target.files[entry.path] = entry.content;
        delete target.symlinks[entry.path];
      } else if (entry.kind === "symlink") {
        target.symlinks[entry.path] = entry.target;
        delete target.files[entry.path];
      } else {
        delete target.files[entry.path];
        delete target.symlinks[entry.path];
      }
      restored.push(entry.path);
    } catch (error) {
      failed.push({
        path: entry.path,
        reason: error instanceof Error ? error.message : "unknown rollback failure"
      });
    }
  }

  return {
    restored,
    failed
  };
}
