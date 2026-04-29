import { describe, expect, it } from "vitest";
import {
  deriveMaterializationLock,
  validateAgentBrainRepo
} from "../../src/core/model.js";
import type { AgentBrainRepo } from "../../src/core/model.js";

describe("canonical Agent Brain model", () => {
  const validRepo: AgentBrainRepo = {
    schemaVersion: 1,
    packages: [
      {
        id: "pkg.skill.review",
        kind: "skill",
        name: "Review Skill",
        files: ["packages/review/SKILL.md"],
        provenance: {
          sourceKind: "dotstate",
          sourcePath: "/fixture/dotstate/skills/review",
          originalTarget: "/fixture/.claude/skills/review",
          adapter: "claude-code",
          classification: "portable-source",
          confidence: 0.96
        }
      }
    ],
    profiles: [
      {
        id: "profile.default",
        name: "Default",
        packages: ["pkg.skill.review"],
        targets: {
          "claude-code": {
            packageIds: ["pkg.skill.review"]
          },
          codex: {
            packageIds: ["pkg.skill.review"]
          }
        }
      }
    ],
    exclusions: [
      {
        path: "/fixture/.claude/auth.json",
        classification: "secret",
        reason: "auth material is target-owned"
      }
    ]
  };

  it("validates portable packages, profiles, provenance, and exclusions separately", () => {
    const result = validateAgentBrainRepo(validRepo);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("allows a profile to target Claude Code and Codex without shared physical directories", () => {
    const lock = deriveMaterializationLock(validRepo, {
      adapter: "codex",
      targetRoot: "/fixture/.codex",
      outputs: [
        {
          packageId: "pkg.skill.review",
          path: "skills/review/SKILL.md",
          contentHash: "sha256:test"
        }
      ]
    });

    expect(lock.entries).toEqual([
      {
        adapter: "codex",
        packageId: "pkg.skill.review",
        targetPath: "/fixture/.codex/skills/review/SKILL.md",
        contentHash: "sha256:test",
        generated: true
      }
    ]);
    expect(validRepo.packages[0]?.provenance.originalTarget).toContain(".claude");
  });

  it("rejects unknown classification as portable source unless explicitly overridden", () => {
    const repo: AgentBrainRepo = {
      ...validRepo,
      packages: [
        {
          ...validRepo.packages[0],
          provenance: {
            ...validRepo.packages[0]!.provenance,
            classification: "unknown",
            confidence: 0.25
          }
        }
      ]
    };

    expect(validateAgentBrainRepo(repo).errors).toContain(
      "packages[0].provenance.classification requires userOverride for unknown portable source"
    );

    repo.packages[0]!.provenance.userOverride = true;
    expect(validateAgentBrainRepo(repo).ok).toBe(true);
  });

  it("identifies missing provenance by field family", () => {
    const repo = {
      ...validRepo,
      packages: [
        {
          ...validRepo.packages[0],
          provenance: {
            sourceKind: "dotstate"
          }
        }
      ]
    } as unknown as AgentBrainRepo;

    expect(validateAgentBrainRepo(repo).errors).toEqual(
      expect.arrayContaining([
        "packages[0].provenance.sourcePath is required",
        "packages[0].provenance.adapter is required",
        "packages[0].provenance.classification is required"
      ])
    );
  });
});
