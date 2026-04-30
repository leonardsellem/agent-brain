import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";

export interface TargetBackupInput {
  repoDestination: string;
  targetRoot: string;
}

export interface TargetBackup {
  backupPath: string;
}

export function createTargetBackup(input: TargetBackupInput): TargetBackup {
  const backupRoot = path.join(input.repoDestination, ".agent-brain", "backups");
  const backupPath = path.join(backupRoot, `${new Date().toISOString().replace(/[:.]/g, "-")}-${path.basename(input.targetRoot)}`);
  mkdirSync(backupRoot, { recursive: true });
  cpSync(input.targetRoot, backupPath, {
    recursive: true,
    force: false,
    errorOnExist: true
  });

  return {
    backupPath
  };
}
