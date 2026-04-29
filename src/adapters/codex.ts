import { adapterVocabulary, classifyByRules } from "./index.js";
import type { TargetAdapter } from "./index.js";

export const codexAdapter: TargetAdapter = {
  name: "codex",
  vocabulary: adapterVocabulary,

  classifyPath(candidatePath) {
    return classifyByRules(candidatePath, [
      [/^~\/\.codex\/config\.toml$/, role("native-owned", "user-config", 0.9)],
      [/^\.codex\/config\.toml$/, role("portable-source", "trusted-project-config", 0.9)],
      [/^AGENTS\.md$/, role("portable-source", "project-instructions", 0.95)],
      [/^~\/\.agents\/skills\/.+\/SKILL\.md$/, role("portable-source", "user-skill", 0.95)],
      [/^~\/\.codex\/skills\/.+\/SKILL\.md$/, role("portable-source", "legacy-user-skill", 0.75)],
      [/^~\/\.codex\/agents\/.+\.md$/, role("portable-source", "user-agent", 0.85)],
      [/^~\/\.codex\/hooks\//, role("portable-source", "hook", 0.8)],
      [/^~\/\.codex\/plugins\/cache\//, role("runtime-cache", "plugin-cache", 0.95)],
      [/^~\/\.codex\/history\.jsonl$/, role("runtime-cache", "history", 0.95)],
      [/^~\/\.codex\/auth\.json$/, role("secret", "auth", 0.98)],
      [/^~\/\.codex\/memory\//, role("machine-local", "memory", 0.7)]
    ]);
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
