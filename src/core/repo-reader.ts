import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { AgentBrainRepo } from "./model.js";
import { validateAgentBrainRepo } from "./model.js";
import { resolveContainedPath, safeRelativePath } from "./path-safety.js";

export interface RepoReadResult {
  ok: boolean;
  errors: string[];
  repo?: AgentBrainRepo;
  packageFiles: Record<string, string>;
}

export function readAgentBrainRepo(repoRoot: string): RepoReadResult {
  const absoluteRoot = path.resolve(repoRoot);
  const errors: string[] = [];
  const packageFiles: Record<string, string> = {};

  const repo = readRepoManifest(absoluteRoot, errors);
  if (!repo) {
    return { ok: false, errors, packageFiles };
  }

  errors.push(...validateAgentBrainRepo(repo).errors);

  repo.packages.forEach((pkg, packageIndex) => {
    pkg.files.forEach((filePath, fileIndex) => {
      try {
        safeRelativePath(filePath);
        const absolutePath = resolveContainedPath(absoluteRoot, filePath);
        if (!existsSync(absolutePath)) {
          errors.push(`packages[${packageIndex}].files[${fileIndex}] missing: ${filePath}`);
          return;
        }
        packageFiles[filePath] = readFileSync(absolutePath, "utf8");
      } catch (error) {
        errors.push(
          `packages[${packageIndex}].files[${fileIndex}] invalid: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });
  });

  return {
    ok: errors.length === 0,
    errors,
    repo,
    packageFiles
  };
}

function readRepoManifest(repoRoot: string, errors: string[]): AgentBrainRepo | undefined {
  const manifestPath = path.join(repoRoot, "agent-brain.json");
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8")) as AgentBrainRepo;
  } catch (error) {
    errors.push(`agent-brain.json could not be read: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}
