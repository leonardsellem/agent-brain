import { createHash } from "node:crypto";
import path from "node:path";
import type { AgentBrainRepo, MaterializationLock } from "../core/model.js";
import { deriveMaterializationLock } from "../core/model.js";
import type { TargetAdapterName } from "../core/provenance.js";
import type { Finding } from "../types.js";
import type { VirtualTarget } from "./dry-run.js";

export interface BootstrapResult {
  lock: MaterializationLock;
  target: VirtualTarget;
}

export function verifyTarget(target: VirtualTarget, lock: MaterializationLock): Finding[] {
  const findings: Finding[] = [];

  for (const entry of lock.entries) {
    const content = target.files[entry.targetPath];
    if (content === undefined) {
      findings.push({
        id: "generated-target-missing",
        severity: "high",
        category: "generated-target",
        path: entry.targetPath,
        message: "Generated target file is missing"
      });
      continue;
    }

    if (hashContent(content) !== entry.contentHash) {
      findings.push({
        id: "generated-target-drift",
        severity: "medium",
        category: "generated-target",
        path: entry.targetPath,
        message: "Generated target file differs from materialization lock",
        recommendation: "Review user changes before regenerating"
      });
      continue;
    }

    if (entry.adapter === "codex" && entry.targetPath.endsWith("config.toml") && content.includes("[")) {
      findings.push({
        id: "codex.malformed-config",
        severity: "high",
        category: "native-owned",
        path: entry.targetPath,
        message: "Codex config could not be parsed",
        recommendation: "Fix config syntax before apply or verify"
      });
    }
  }

  return findings;
}

export function bootstrapTarget(
  repo: AgentBrainRepo,
  adapter: TargetAdapterName,
  targetRoot: string
): BootstrapResult {
  const outputs = repo.packages.map((pkg) => {
    const packageSlug = pkg.files[0]?.split("/")[1] ?? pkg.id.replace(/^pkg\./, "");
    const targetPath = adapter === "claude-code" ? `skills/${packageSlug}/SKILL.md` : `skills/${packageSlug}/SKILL.md`;
    const content = `# ${pkg.name}\n`;
    return {
      packageId: pkg.id,
      path: targetPath,
      content,
      contentHash: hashContent(content)
    };
  });

  const lock = deriveMaterializationLock(repo, {
    adapter,
    targetRoot,
    outputs: outputs.map(({ packageId, path, contentHash }) => ({
      packageId,
      path,
      contentHash
    }))
  });

  const target: VirtualTarget = {
    files: Object.fromEntries(
      lock.entries.map((entry, index) => [entry.targetPath, outputs[index]!.content])
    ),
    symlinks: {}
  };

  return {
    lock,
    target
  };
}

export function hashContent(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}
