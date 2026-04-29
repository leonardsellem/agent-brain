import { adapterVocabulary, classifyByRules } from "./index.js";
import type { TargetAdapter } from "./index.js";

export const codexAdapter: TargetAdapter = {
  name: "codex",
  vocabulary: adapterVocabulary,
  capabilities: {
    version: 1,
    packageKinds: ["skill"]
  },

  classifyPath(candidatePath) {
    return classifyByRules(candidatePath, [
      [/^~\/\.codex\/config\.toml$/, role("native-owned", "user-config", 0.9)],
      [/^\.codex\/config\.toml$/, role("portable-source", "trusted-project-config", 0.9)],
      [/^AGENTS\.md$/, role("portable-source", "project-instructions", 0.95)],
      [/^~\/\.agents\/skills\/.+\/SKILL\.md$/, role("portable-source", "user-skill", 0.95)],
      [/(^|\/)\.codex\/skills\/.+\/SKILL\.md$/, role("portable-source", "legacy-user-skill", 0.75)],
      [/^~\/\.codex\/agents\/.+\.md$/, role("portable-source", "user-agent", 0.85)],
      [/^~\/\.codex\/hooks\//, role("portable-source", "hook", 0.8)],
      [/^~\/\.codex\/plugins\/cache\//, role("runtime-cache", "plugin-cache", 0.95)],
      [/^~\/\.codex\/history\.jsonl$/, role("runtime-cache", "history", 0.95)],
      [/^~\/\.codex\/auth\.json$/, role("secret", "auth", 0.98)],
      [/^~\/\.codex\/memory\//, role("machine-local", "memory", 0.7)]
    ]);
  },

  materializePackage(input) {
    if (input.pkg.kind !== "skill") {
      return unsupportedPackage(input.pkg);
    }

    return {
      ok: true,
      path: `skills/${packageSlug(input.pkg)}/SKILL.md`,
      content: input.content
    };
  },

  verifyTarget(input) {
    if (input.readable) {
      return [];
    }

    return [
      {
        id: "codex.unreadable-root",
        severity: "high",
        category: "unknown",
        path: input.root,
        message: "Codex target root is unreadable"
      }
    ];
  }
};

function unsupportedPackage(pkg: Parameters<TargetAdapter["materializePackage"]>[0]["pkg"]) {
  return {
    ok: false as const,
    finding: {
      id: "unsupported-package-kind",
      severity: "medium" as const,
      category: "unknown",
      path: pkg.id,
      message: `Codex adapter cannot materialize ${pkg.kind} packages yet`,
      recommendation: "Leave this package as a review item until the adapter supports the package kind"
    }
  };
}

function packageSlug(pkg: Parameters<TargetAdapter["materializePackage"]>[0]["pkg"]): string {
  return pkg.files[0]?.split("/")[1] ?? pkg.id.replace(/^pkg\./, "");
}

function role(
  classification: ReturnType<TargetAdapter["classifyPath"]>["classification"],
  roleName: string,
  confidence: number
) {
  return {
    classification,
    role: roleName,
    confidence
  };
}
