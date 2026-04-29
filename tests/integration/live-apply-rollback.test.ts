import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";

describe("live apply transaction", () => {
  it("requires an exact dry-run fingerprint, snapshots before mutation, writes target and lock metadata", async () => {
    const sourceRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-source-"));
    const repo = mkdtempSync(path.join(os.tmpdir(), "agent-brain-repo-"));
    const targetRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-target-"));
    const skillPath = path.join(sourceRoot, ".dotstate/storage/Personal/.claude/skills/review/SKILL.md");
    mkdirSync(path.dirname(skillPath), { recursive: true });
    writeFileSync(skillPath, "# Live Review\n");
    const cli = createCli();
    expect((await cli.run(["import", "--source-root", sourceRoot, "--repo", repo, "--json"])).exitCode).toBe(0);

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
    const fingerprint = JSON.parse(dryRun.stdout).findings[0].provenance.fingerprint;

    const refused = await cli.run([
      "apply",
      "--repo",
      repo,
      "--target-root",
      targetRoot,
      "--adapter",
      "claude-code",
      "--profile",
      "profile.default",
      "--confirm-fingerprint",
      "sha256:wrong",
      "--json"
    ]);
    expect(refused.exitCode).toBe(1);
    expect(readFileSync(skillPath, "utf8")).toBe("# Live Review\n");

    const applied = await cli.run([
      "apply",
      "--repo",
      repo,
      "--target-root",
      targetRoot,
      "--adapter",
      "claude-code",
      "--profile",
      "profile.default",
      "--confirm-fingerprint",
      fingerprint,
      "--json"
    ]);
    const report = JSON.parse(applied.stdout);

    expect(applied.exitCode).toBe(0);
    expect(readFileSync(path.join(targetRoot, "skills/review/SKILL.md"), "utf8")).toBe("# Live Review\n");
    expect(readFileSync(path.join(repo, ".agent-brain/materialization-lock.json"), "utf8")).toContain(
      "/skills/review/SKILL.md"
    );
    expect(report.findings).toEqual([
      expect.objectContaining({
        id: "apply.snapshot-created",
        path: targetRoot,
        provenance: expect.objectContaining({
          fingerprint,
          snapshotPath: expect.stringContaining(".agent-brain/snapshots/"),
          lockPath: path.join(repo, ".agent-brain/materialization-lock.json"),
          changedPaths: [path.join(targetRoot, "skills/review/SKILL.md")]
        })
      })
    ]);
  });
});
