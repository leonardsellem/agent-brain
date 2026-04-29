import { adapterVocabulary, classifyByRules } from "./index.js";
import type { TargetAdapter } from "./index.js";

export const claudeCodeAdapter: TargetAdapter = {
  name: "claude-code",
  vocabulary: adapterVocabulary,
  capabilities: {
    version: 1,
    packageKinds: ["skill"]
  },

  classifyPath(candidatePath) {
    return classifyByRules(candidatePath, [
      [/^~\/\.claude\/settings(\.local)?\.json$/, role("native-owned", "user-settings", 0.9)],
      [/^\.claude\/settings(\.local)?\.json$/, role("native-owned", "project-settings", 0.85)],
      [/(^|\/)\.claude\/skills\/.+\/SKILL\.md$/, role("portable-source", "personal-skill", 0.95)],
      [/^\.claude\/skills\/.+\/SKILL\.md$/, role("portable-source", "project-skill", 0.95)],
      [/^~\/\.claude\/plugins\/.+/, role("native-owned", "plugin-surface", 0.8)],
      [/^\.claude\/agents\/.+\.md$/, role("portable-source", "project-subagent", 0.9)],
      [/^~\/\.claude\/agents\/.+\.md$/, role("portable-source", "user-subagent", 0.9)],
      [/^\.mcp\.json$/, role("portable-source", "project-mcp", 0.85)],
      [/^~\/\.claude\.json$/, role("secret", "user-mcp-and-session-state", 0.9)],
      [/^~\/\.claude\/(cache|logs|statsig|shell-snapshots)\//, role("runtime-cache", "runtime", 0.95)]
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
        id: "claude-code.unreadable-root",
        severity: "high",
        category: "unknown",
        path: input.root,
        message: "Claude Code target root is unreadable"
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
      message: `Claude Code adapter cannot materialize ${pkg.kind} packages yet`,
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
