import { describe, expect, it } from "vitest";
import { bootstrapTarget } from "../../src/apply/verifier.js";
import type { AgentBrainRepo } from "../../src/core/model.js";

describe("bootstrap", () => {
  it("materializes a second-machine target root without preserving original app home paths", () => {
    const repo: AgentBrainRepo = {
      schemaVersion: 1,
      packages: [
        {
          id: "pkg.review",
          kind: "skill",
          name: "Review",
          files: ["packages/review/SKILL.md"],
          provenance: {
            sourceKind: "home",
            sourcePath: "/machine-a/.claude/skills/review/SKILL.md",
            originalTarget: "/machine-a/.claude/skills/review/SKILL.md",
            adapter: "claude-code",
            classification: "portable-source",
            confidence: 0.95
          }
        }
      ],
      profiles: [
        {
          id: "profile.default",
          name: "Default",
          packages: ["pkg.review"],
          targets: {
            "claude-code": { packageIds: ["pkg.review"] }
          }
        }
      ],
      exclusions: []
    };

    const result = bootstrapTarget(repo, "claude-code", "/machine-b/.claude");

    expect(result.lock.entries[0]?.targetPath).toBe("/machine-b/.claude/skills/review/SKILL.md");
    expect(result.lock.entries[0]?.targetPath).not.toContain("/machine-a/");
  });
});
