import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createAdoptionPlan } from "../../src/import/adoption-plan.js";
import { writeBrainRepo } from "../../src/import/brain-writer.js";
import { writeRepoFiles } from "../../src/core/repo-writer.js";
import { readAgentBrainRepo } from "../../src/core/repo-reader.js";

describe("repo reader", () => {
  it("loads and validates a repo written by import", () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-reader-"));
    const plan = createAdoptionPlan([
      {
        path: "~/.claude/skills/review/SKILL.md",
        kind: "file",
        adapter: "claude-code",
        contentSample: "# Review\n"
      }
    ]);
    const write = writeBrainRepo(plan);
    writeRepoFiles(repoRoot, Object.fromEntries(write.writtenPaths.map((filePath) => [filePath, write.files[filePath]!])));

    const loaded = readAgentBrainRepo(repoRoot);

    expect(loaded.ok).toBe(true);
    expect(loaded.repo?.packages[0]).toMatchObject({
      id: "pkg.review",
      files: ["packages/review/SKILL.md"]
    });
    expect(loaded.packageFiles["packages/review/SKILL.md"]).toBe("# Review\n");
  });

  it("fails closed for malformed package references and missing source files", () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-reader-"));
    mkdirSync(path.join(repoRoot, "profiles"), { recursive: true });
    writeFileSync(
      path.join(repoRoot, "agent-brain.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          packages: [
            {
              id: "pkg.review",
              kind: "skill",
              name: "Review",
              files: ["packages/review/SKILL.md"],
              provenance: {
                sourceKind: "home",
                sourcePath: "~/.claude/skills/review/SKILL.md",
                originalTarget: "~/.claude/skills/review/SKILL.md",
                adapter: "claude-code",
                classification: "portable-source",
                confidence: 0.9
              }
            }
          ],
          profiles: [
            {
              id: "profile.default",
              name: "Default",
              packages: ["pkg.missing"],
              targets: {}
            }
          ],
          exclusions: []
        },
        null,
        2
      )
    );

    const loaded = readAgentBrainRepo(repoRoot);

    expect(loaded.ok).toBe(false);
    expect(loaded.errors).toEqual(
      expect.arrayContaining([
        "profiles[0].packages references missing package pkg.missing",
        "packages[0].files[0] missing: packages/review/SKILL.md"
      ])
    );
  });
});
