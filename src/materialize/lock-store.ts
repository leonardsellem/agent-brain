import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { MaterializationLock } from "../core/model.js";
import type { TargetAdapterName } from "../core/provenance.js";
import { writeRepoFiles } from "../core/repo-writer.js";

const lockRelativePath = ".agent-brain/materialization-lock.json";

export interface LockWriteResult {
  path: string;
}

export type LockReadResult =
  | {
      ok: true;
      path: string;
      lock: MaterializationLock;
      errors?: never;
    }
  | {
      ok: false;
      path: string;
      errors: string[];
      lock?: never;
    };

export interface LockValidationResult {
  ok: boolean;
  errors: string[];
}

export function writeMaterializationLock(repoRoot: string, lock: MaterializationLock): LockWriteResult {
  const written = writeRepoFiles(repoRoot, {
    [lockRelativePath]: stableJson(lock)
  });

  return {
    path: written.writtenPaths[0]!
  };
}

export function readMaterializationLock(repoRoot: string): LockReadResult {
  const lockPath = path.join(path.resolve(repoRoot), lockRelativePath);
  if (!existsSync(lockPath)) {
    return {
      ok: false,
      path: lockPath,
      errors: ["materialization lock missing"]
    };
  }

  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf8")) as MaterializationLock;
    const validation = validateMaterializationLock(lock);
    if (!validation.ok) {
      return {
        ok: false,
        path: lockPath,
        errors: validation.errors
      };
    }

    return {
      ok: true,
      path: lockPath,
      lock
    };
  } catch (error) {
    return {
      ok: false,
      path: lockPath,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

export function validateLockAdapter(
  lock: MaterializationLock,
  adapter: TargetAdapterName
): LockValidationResult {
  const mismatchedAdapters = [
    ...new Set(lock.entries.filter((entry) => entry.adapter !== adapter).map((entry) => entry.adapter))
  ];

  return {
    ok: mismatchedAdapters.length === 0,
    errors: mismatchedAdapters.map(
      (mismatchedAdapter) => `materialization lock contains ${mismatchedAdapter} entries for ${adapter} apply`
    )
  };
}

function validateMaterializationLock(lock: MaterializationLock): LockValidationResult {
  const errors: string[] = [];

  if (lock.schemaVersion !== 1) {
    errors.push("materialization lock schemaVersion must be 1");
  }
  if (!Array.isArray(lock.entries)) {
    errors.push("materialization lock entries must be an array");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
