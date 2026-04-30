import { describe, expect, it } from "vitest";
import type { AgentBrainRepo } from "../../src/core/model.js";
import { planTargetMaterialization } from "../../src/materialize/target-planner.js";

describe("target planner", () => {
  it("uses adapters to plan Claude Code generated skill targets", () => {
    const plan = planTargetMaterialization({
      repo: repoWithPackage("skill"),
      packageFiles: { "packages/review/SKILL.md": "# Review\n" },
      adapter: "claude-code",
      profileId: "profile.default",
      targetRoot: "/target/claude",
      target: { files: {}, symlinks: {} }
    });

    expect(plan.findings).toEqual([]);
    expect(plan.operations).toEqual([
      {
        type: "create",
        path: "/target/claude/skills/review/SKILL.md",
        content: "# Review\n"
      }
    ]);
    expect(plan.lock.entries[0]).toMatchObject({
      adapter: "claude-code",
      packageId: "pkg.review",
      targetPath: "/target/claude/skills/review/SKILL.md"
    });
  });

  it("uses adapter-specific paths without changing canonical package files", () => {
    const repo = repoWithPackage("skill");
    const plan = planTargetMaterialization({
      repo,
      packageFiles: { "packages/review/SKILL.md": "# Review\n" },
      adapter: "codex",
      profileId: "profile.default",
      targetRoot: "/target/codex",
      target: { files: { "/target/codex/skills/review/SKILL.md": "old" }, symlinks: {} }
    });

    expect(repo.packages[0]?.files).toEqual(["packages/review/SKILL.md"]);
    expect(plan.operations).toEqual([
      {
        type: "update",
        path: "/target/codex/skills/review/SKILL.md",
        content: "# Review\n"
      }
    ]);
  });

  it("skips generated target writes when existing content already matches", () => {
    const plan = planTargetMaterialization({
      repo: repoWithPackage("skill"),
      packageFiles: { "packages/review/SKILL.md": "# Review\n" },
      adapter: "codex",
      profileId: "profile.default",
      targetRoot: "/target/codex",
      target: { files: { "/target/codex/skills/review/SKILL.md": "# Review\n" }, symlinks: {} }
    });

    expect(plan.operations).toEqual([]);
    expect(plan.findings).toEqual([]);
  });

  it("refuses to write through existing symlink target paths", () => {
    const plan = planTargetMaterialization({
      repo: repoWithPackage("skill"),
      packageFiles: { "packages/review/SKILL.md": "# Review\n" },
      adapter: "codex",
      profileId: "profile.default",
      targetRoot: "/target/codex",
      target: {
        files: {},
        symlinks: { "/target/codex/skills/review/SKILL.md": "/shared/review/SKILL.md" }
      }
    });

    expect(plan.operations).toEqual([]);
    expect(plan.lock.entries).toEqual([]);
    expect(plan.findings).toEqual([
      expect.objectContaining({
        id: "generated-target-symlink-collision",
        path: "/target/codex/skills/review/SKILL.md"
      })
    ]);
  });

  it("reports unsupported package kinds instead of blindly writing them", () => {
    const plan = planTargetMaterialization({
      repo: repoWithPackage("prompt"),
      packageFiles: { "packages/review/SKILL.md": "# Review\n" },
      adapter: "codex",
      profileId: "profile.default",
      targetRoot: "/target/codex",
      target: { files: {}, symlinks: {} }
    });

    expect(plan.operations).toEqual([]);
    expect(plan.findings).toEqual([
      expect.objectContaining({
        id: "unsupported-package-kind",
        severity: "medium",
        category: "unknown",
        path: "pkg.review"
      })
    ]);
  });
});

function repoWithPackage(kind: AgentBrainRepo["packages"][number]["kind"]): AgentBrainRepo {
  return {
    schemaVersion: 1,
    packages: [
      {
        id: "pkg.review",
        kind,
        name: "Review",
        files: ["packages/review/SKILL.md"],
        provenance: {
          sourceKind: "home",
          sourcePath: "~/.claude/skills/review/SKILL.md",
          originalTarget: "~/.claude/skills/review/SKILL.md",
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
          "claude-code": { packageIds: ["pkg.review"] },
          codex: { packageIds: ["pkg.review"] }
        }
      }
    ],
    exclusions: []
  };
}
