import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

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
  if (path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
    throw new Error(`Refusing to write outside repo destination: ${relativePath}`);
  }

  const destination = path.resolve(root, relativePath);
  if (destination !== root && !destination.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to write outside repo destination: ${relativePath}`);
  }

  return destination;
}
