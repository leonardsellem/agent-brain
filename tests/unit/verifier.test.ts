import { describe, expect, it } from "vitest";
import { hashContent, verifyTarget } from "../../src/apply/verifier.js";
import type { MaterializationLock } from "../../src/core/model.js";

describe("target verifier", () => {
  it("succeeds when generated locks and target files agree", () => {
    const lock: MaterializationLock = {
      schemaVersion: 1,
      entries: [
        {
          adapter: "codex",
          packageId: "pkg.review",
          targetPath: "/target/skills/review/SKILL.md",
          contentHash: hashContent("skill"),
          generated: true
        }
      ]
    };

    expect(verifyTarget({ files: { "/target/skills/review/SKILL.md": "skill" }, symlinks: {} }, lock)).toEqual([]);
  });

  it("reports drift when a generated target file was modified", () => {
    const findings = verifyTarget(
      { files: { "/target/skills/review/SKILL.md": "user edit" }, symlinks: {} },
      {
        schemaVersion: 1,
        entries: [
          {
            adapter: "codex",
            packageId: "pkg.review",
            targetPath: "/target/skills/review/SKILL.md",
            contentHash: hashContent("generated"),
            generated: true
          }
        ]
      }
    );

    expect(findings).toEqual([
      expect.objectContaining({
        id: "generated-target-drift",
        severity: "medium",
        path: "/target/skills/review/SKILL.md"
      })
    ]);
  });

  it("reports malformed config with adapter context without blocking unrelated surfaces", () => {
    const findings = verifyTarget(
      {
        files: {
          "/target/config.toml": "malformed = [",
          "/target/skills/review/SKILL.md": "ok"
        },
        symlinks: {}
      },
      {
        schemaVersion: 1,
        entries: [
          {
            adapter: "codex",
            packageId: "pkg.config",
            targetPath: "/target/config.toml",
            contentHash: hashContent("malformed = ["),
            generated: true
          },
          {
            adapter: "codex",
            packageId: "pkg.review",
            targetPath: "/target/skills/review/SKILL.md",
            contentHash: hashContent("ok"),
            generated: true
          }
        ]
      }
    );

    expect(findings).toEqual([
      expect.objectContaining({
        id: "codex.malformed-config",
        path: "/target/config.toml"
      })
    ]);
  });
});
