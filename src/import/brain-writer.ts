import type { AgentBrainRepo } from "../core/model.js";
import type { AdoptionPlan } from "./adoption-plan.js";

export interface BrainWriteResult {
  files: Record<string, string>;
  changed: boolean;
  writtenPaths: string[];
}

export function writeBrainRepo(
  plan: AdoptionPlan,
  existingFiles: Record<string, string> = {}
): BrainWriteResult {
  const repo: AgentBrainRepo = {
    schemaVersion: 1,
    packages: plan.packages,
    profiles: [plan.profile],
    exclusions: plan.exclusions
  };
  const nextFiles: Record<string, string> = {
    ...existingFiles,
    "agent-brain.json": stableJson(repo),
    "profiles/default.json": stableJson(plan.profile)
  };

  for (const pkg of plan.packages) {
    const packageSlug = pkg.files[0]?.split("/")[1] ?? pkg.id.replace(/^pkg\./, "");
    nextFiles[`packages/${packageSlug}/package.json`] = stableJson(pkg);
  }

  const writtenPaths = Object.keys(nextFiles)
    .filter((path) => existingFiles[path] !== nextFiles[path])
    .sort((left, right) => sortPath(left).localeCompare(sortPath(right)));

  return {
    files: nextFiles,
    changed: writtenPaths.length > 0,
    writtenPaths
  };
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sortPath(path: string): string {
  if (path === "agent-brain.json") {
    return "0";
  }
  if (path.startsWith("packages/")) {
    return `1:${path}`;
  }
  return `2:${path}`;
}
