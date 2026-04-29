import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveContainedPath, safeRelativePath } from "./path-safety.js";

export interface RepoWriteResult {
  writtenPaths: string[];
}

export function writeRepoFiles(repoRoot: string, files: Record<string, string>): RepoWriteResult {
  const absoluteRoot = path.resolve(repoRoot);
  const writtenPaths: string[] = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const destination = safeDestination(absoluteRoot, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, content);
    writtenPaths.push(destination);
  }

  return {
    writtenPaths
  };
}

function safeDestination(root: string, relativePath: string): string {
  try {
    safeRelativePath(relativePath);
    return resolveContainedPath(root, relativePath);
  } catch {
    throw new Error(`Refusing to write outside repo destination: ${relativePath}`);
  }
}
