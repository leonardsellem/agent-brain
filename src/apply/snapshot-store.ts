import path from "node:path";
import type { Snapshot } from "./snapshot.js";
import { writeRepoFiles } from "../core/repo-writer.js";

export interface SnapshotWriteResult {
  path: string;
}

export function writeSnapshot(repoRoot: string, snapshot: Snapshot): SnapshotWriteResult {
  const relativePath = path.posix.join(".agent-brain", "snapshots", `${snapshot.id}.json`);
  const written = writeRepoFiles(repoRoot, {
    [relativePath]: `${JSON.stringify(snapshot, null, 2)}\n`
  });

  return {
    path: written.writtenPaths[0]!
  };
}
