import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";

describe("live dry-run", () => {
  it("plans operations from an Agent Brain repo and does not mutate the target root", async () => {
    const sourceRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-source-"));
    const repo = mkdtempSync(path.join(os.tmpdir(), "agent-brain-repo-"));
    const targetRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-target-"));
    const skillPath = path.join(sourceRoot, ".dotstate/storage/Personal/.claude/skills/review/SKILL.md");
    mkdirSync(path.dirname(skillPath), { recursive: true });
    writeFileSync(skillPath, "# Live Review\n");
    const cli = createCli();

    const imported = await cli.run(["import", "--source-root", sourceRoot, "--repo", repo, "--json"]);
    expect(imported.exitCode).toBe(0);

    const dryRun = await cli.run([
      "apply",
      "--repo",
      repo,
      "--target-root",
      targetRoot,
      "--adapter",
      "claude-code",
      "--profile",
      "profile.default",
      "--json"
    ]);
    const report = JSON.parse(dryRun.stdout);

    expect(dryRun.exitCode).toBe(0);
    expect(report.findings).toEqual([
      expect.objectContaining({
        id: "apply.dry-run",
        path: targetRoot,
        provenance: expect.objectContaining({
          fingerprint: expect.stringMatching(/^sha256:/),
          operations: [
            expect.objectContaining({
              type: "create",
              path: path.join(targetRoot, "skills/review/SKILL.md"),
              content: "# Live Review\n"
            })
          ]
        })
      })
    ]);
    expect(existsSync(path.join(targetRoot, "skills/review/SKILL.md"))).toBe(false);

    const repeated = await cli.run([
      "apply",
      "--repo",
      repo,
      "--target-root",
      targetRoot,
      "--adapter",
      "claude-code",
      "--profile",
      "profile.default",
      "--json"
    ]);

    expect(JSON.parse(repeated.stdout).findings[0].provenance.fingerprint).toBe(
      report.findings[0].provenance.fingerprint
    );
  });

  it("fails closed before scanning unrelated paths when live dry-run inputs are incomplete", async () => {
    const cli = createCli();
    const targetRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-target-"));

    const result = await cli.run(["apply", "--target-root", targetRoot, "--repo", "/missing/repo", "--json"]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "adapter_required"
      }
    });
    expect(readdirSync(targetRoot)).toEqual([]);
  });
});
