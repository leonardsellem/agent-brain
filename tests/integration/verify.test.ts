import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";
import { createVerifyCommand } from "../../src/commands/verify.js";
import { writeMaterializationLock } from "../../src/materialize/lock-store.js";

describe("verify command", () => {
  it("fails closed when public verify has no target or lock evidence", async () => {
    const cli = createCli({
      commands: {
        verify: createVerifyCommand()
      }
    });

    const result = await cli.run(["verify", "--json"]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "verify_requires_target"
      }
    });
  });

  it("reports target and lock context for fixture-backed verification", async () => {
    const cli = createCli({
      commands: {
        verify: createVerifyCommand()
      }
    });

    const result = await cli.run([
      "verify",
      "--json",
      "--fixture",
      "tests/fixtures/e2e-persona/scannable.json",
      "--target-root",
      "/synthetic/target"
    ]);
    const report = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(report.summary).toContain("/synthetic/target");
    expect(report.findings).toEqual([
      expect.objectContaining({
        id: "verify.checked",
        path: "/synthetic/target",
        provenance: expect.objectContaining({
          targetRoot: "/synthetic/target",
          lockEntries: expect.arrayContaining([
            expect.objectContaining({
              targetPath: "/synthetic/target/skills/review/SKILL.md"
            })
          ])
        })
      })
    ]);
  });

  it("verifies only lock entries for the requested live adapter and target", async () => {
    const repo = mkdtempSync(path.join(os.tmpdir(), "agent-brain-repo-"));
    const claudeTarget = mkdtempSync(path.join(os.tmpdir(), "agent-brain-claude-"));
    const codexTarget = mkdtempSync(path.join(os.tmpdir(), "agent-brain-agents-"));
    mkdirSync(path.join(claudeTarget, "skills/review"), { recursive: true });
    mkdirSync(path.join(codexTarget, "skills/helper"), { recursive: true });
    writeFileSync(path.join(claudeTarget, "skills/review/SKILL.md"), "# Review\n");
    writeFileSync(path.join(codexTarget, "skills/helper/SKILL.md"), "# Helper\n");
    writeMaterializationLock(repo, {
      schemaVersion: 1,
      entries: [
        {
          adapter: "claude-code",
          packageId: "pkg.review",
          targetPath: path.join(claudeTarget, "skills/review/SKILL.md"),
          contentHash: "sha256:60390e262951c11c87fb37a0bba58ec02f73889fe444964faf0037e3adce528a",
          generated: true
        },
        {
          adapter: "codex",
          packageId: "pkg.helper",
          targetPath: path.join(codexTarget, "skills/helper/SKILL.md"),
          contentHash: "sha256:0e51e1fd033564eae6cc0edcdfcbf7a1c009654a86f6e82625d05227b61032df",
          generated: true
        }
      ]
    });
    const cli = createCli();

    const result = await cli.run([
      "verify",
      "--repo",
      repo,
      "--target-root",
      claudeTarget,
      "--adapter",
      "claude-code",
      "--json"
    ]);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).findings[0]).toMatchObject({
      id: "verify.checked",
      provenance: {
        lockEntries: [
          expect.objectContaining({
            adapter: "claude-code",
            packageId: "pkg.review"
          })
        ]
      }
    });
  });

  it("reports remaining unknown or risky areas as actionable findings", async () => {
    const cli = createCli({
      commands: {
        verify: createVerifyCommand([
          {
            id: "unmanaged-leftover",
            severity: "low",
            category: "unknown",
            path: "/target/unknown",
            message: "Unmanaged target content remains"
          }
        ])
      }
    });

    const result = await cli.run(["verify", "--json"]);

    expect(JSON.parse(result.stdout).findings).toEqual([
      expect.objectContaining({
        id: "unmanaged-leftover",
        path: "/target/unknown"
      })
    ]);
  });
});
