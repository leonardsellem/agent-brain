import path from "node:path";
import { claudeCodeAdapter } from "../adapters/claude-code.js";
import { codexAdapter } from "../adapters/codex.js";
import type { TargetAdapter } from "../adapters/index.js";
import type { AgentBrainRepo, MaterializationLock } from "../core/model.js";
import { deriveMaterializationLock } from "../core/model.js";
import type { TargetAdapterName } from "../core/provenance.js";
import type { Finding } from "../types.js";
import type { ApplyOperation, VirtualTarget } from "../apply/dry-run.js";
import { hashContent } from "../apply/verifier.js";

export interface TargetMaterializationInput {
  repo: AgentBrainRepo;
  packageFiles: Record<string, string>;
  adapter: TargetAdapterName;
  profileId: string;
  targetRoot: string;
  target: VirtualTarget;
}

export interface TargetMaterializationPlan {
  operations: ApplyOperation[];
  lock: MaterializationLock;
  findings: Finding[];
}

export function planTargetMaterialization(
  input: TargetMaterializationInput
): TargetMaterializationPlan {
  const adapter = adapterByName(input.adapter);
  const profile = input.repo.profiles.find((candidate) => candidate.id === input.profileId);
  if (!profile) {
    return emptyPlan(input, [
      {
        id: "profile-missing",
        severity: "high",
        category: "unknown",
        path: input.profileId,
        message: "Profile does not exist in Agent Brain repo"
      }
    ]);
  }

  const targetPackageIds = profile.targets[input.adapter]?.packageIds ?? [];
  const packages = input.repo.packages.filter((pkg) => targetPackageIds.includes(pkg.id));
  const findings: Finding[] = [];
  const outputs: Array<{ packageId: string; path: string; content: string; contentHash: string }> = [];
  const operations: ApplyOperation[] = [];

  for (const pkg of packages) {
    const content = input.packageFiles[pkg.files[0]!] ?? "";
    const materialized = adapter.materializePackage({ pkg, content });
    if (!materialized.ok) {
      findings.push(materialized.finding);
      continue;
    }

    const targetPath = path.posix.join(input.targetRoot, materialized.path);
    outputs.push({
      packageId: pkg.id,
      path: materialized.path,
      content: materialized.content,
      contentHash: hashContent(materialized.content)
    });

    const currentContent = input.target.files[targetPath];
    operations.push({
      type: currentContent === undefined ? "create" : "update",
      path: targetPath,
      content: materialized.content
    });
  }

  return {
    operations,
    findings,
    lock: deriveMaterializationLock(input.repo, {
      adapter: input.adapter,
      targetRoot: input.targetRoot,
      outputs: outputs.map(({ packageId, path, contentHash }) => ({
        packageId,
        path,
        contentHash
      }))
    })
  };
}

function emptyPlan(input: TargetMaterializationInput, findings: Finding[]): TargetMaterializationPlan {
  return {
    operations: [],
    findings,
    lock: deriveMaterializationLock(input.repo, {
      adapter: input.adapter,
      targetRoot: input.targetRoot,
      outputs: []
    })
  };
}

function adapterByName(adapter: TargetAdapterName): TargetAdapter {
  return adapter === "claude-code" ? claudeCodeAdapter : codexAdapter;
}
