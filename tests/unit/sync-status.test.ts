import { describe, expect, it } from "vitest";
import type { AgentBrainRepo, MaterializationLock } from "../../src/core/model.js";
import { getSyncStatus } from "../../src/core/sync-status.js";

describe("sync status", () => {
  it("compares repo package intent to generated lock state", () => {
    const status = getSyncStatus(repo(["pkg.review", "pkg.audit"]), lock(["pkg.review"]));

    expect(status).toEqual({
      ok: false,
      missingGeneratedPackages: ["pkg.audit"],
      staleGeneratedPackages: [],
      summary: "1 missing generated packages, 0 stale generated packages"
    });
  });

  it("reports generated lock entries that no longer have canonical package intent", () => {
    const status = getSyncStatus(repo(["pkg.review"]), lock(["pkg.review", "pkg.old"]));

    expect(status).toMatchObject({
      ok: false,
      staleGeneratedPackages: ["pkg.old"]
    });
  });
});

function repo(packageIds: string[]): AgentBrainRepo {
  return {
    schemaVersion: 1,
    packages: packageIds.map((id) => ({
      id,
      kind: "skill",
      name: id.replace("pkg.", ""),
      files: [`packages/${id.replace("pkg.", "")}/SKILL.md`],
      provenance: {
        sourceKind: "home",
        sourcePath: "~/.claude/skills/review/SKILL.md",
        originalTarget: "~/.claude/skills/review/SKILL.md",
        adapter: "claude-code",
        classification: "portable-source",
        confidence: 0.95
      }
    })),
    profiles: [],
    exclusions: []
  };
}

function lock(packageIds: string[]): MaterializationLock {
  return {
    schemaVersion: 1,
    entries: packageIds.map((packageId) => ({
      adapter: "claude-code",
      packageId,
      targetPath: `/target/${packageId}`,
      contentHash: "sha256:abc",
      generated: true
    }))
  };
}
