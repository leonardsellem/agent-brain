import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";

describe("bootstrap command", () => {
  it("guides missing-context bootstrap calls toward setup and explicit expert flags", async () => {
    const cli = createCli();

    const result = await cli.run(["bootstrap", "--json"]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "bootstrap_requires_target",
        message: expect.stringContaining("agent-brain setup")
      }
    });
    expect(JSON.parse(result.stdout).error.message).toContain("--target-root");
  });

  it("materializes a second-machine target from Agent Brain repo intent", async () => {
    const machineA = mkdtempSync(path.join(os.tmpdir(), "agent-brain-machine-a-"));
    const repo = mkdtempSync(path.join(os.tmpdir(), "agent-brain-repo-"));
    const machineBTarget = mkdtempSync(path.join(os.tmpdir(), "agent-brain-machine-b-"));
    const skillPath = path.join(machineA, ".dotstate/storage/Personal/.claude/skills/review/SKILL.md");
    mkdirSync(path.dirname(skillPath), { recursive: true });
    writeFileSync(skillPath, "# Portable Review\n");
    const cli = createCli();
    expect((await cli.run(["import", "--source-root", machineA, "--repo", repo, "--json"])).exitCode).toBe(0);

    const dryRun = await cli.run([
      "bootstrap",
      "--repo",
      repo,
      "--target-root",
      machineBTarget,
      "--adapter",
      "claude-code",
      "--profile",
      "profile.default",
      "--json"
    ]);
    const dryRunReport = JSON.parse(dryRun.stdout);
    const fingerprint = dryRunReport.findings[0].provenance.fingerprint;

    expect(dryRunReport.findings[0]).toMatchObject({
      id: "bootstrap.dry-run",
      message: expect.stringContaining("second-machine target")
    });

    const applied = await cli.run([
      "bootstrap",
      "--repo",
      repo,
      "--target-root",
      machineBTarget,
      "--adapter",
      "claude-code",
      "--profile",
      "profile.default",
      "--confirm-fingerprint",
      fingerprint,
      "--json"
    ]);

    expect(applied.exitCode).toBe(0);
    expect(existsSync(path.join(machineBTarget, "skills/review/SKILL.md"))).toBe(true);
    const appliedReport = JSON.parse(applied.stdout);
    expect(appliedReport.findings[0]).toMatchObject({
      id: "bootstrap.snapshot-created",
      message: expect.stringContaining("second-machine target")
    });
    expect(JSON.stringify(appliedReport)).not.toContain(machineA);
  });
});
