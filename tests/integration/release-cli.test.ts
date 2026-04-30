import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const cliPath = path.join(repoRoot, "dist/cli.js");
const fixturePath = "tests/fixtures/e2e-persona/scannable.json";

describe("release CLI regression", () => {
  beforeAll(() => {
    const build = spawnSync("npm", ["run", "build"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(build.status, build.stderr).toBe(0);
  });

  it("exercises the fixture-backed regression workflow", () => {
    const importRepo = mkdtempSync(path.join(os.tmpdir(), "agent-brain-release-cli-"));

    try {
      const help = runCli(["--help"]);
      expect(help.status).toBe(0);
      expect(help.stdout).toContain("agent-brain <command>");

      const doctor = runCli(["doctor", "--fixture", fixturePath, "--json"]);
      expect(doctor.status).toBe(0);
      expect(JSON.parse(doctor.stdout).findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "shared-root",
            severity: "high"
          })
        ])
      );

      const plan = runCli(["plan", "--fixture", fixturePath, "--json"]);
      expect(plan.status).toBe(0);
      expect(JSON.parse(plan.stdout)).toMatchObject({
        ok: true,
        summary: "1 packages, 1 exclusions, 0 conflicts, 1 rejections"
      });

      const imported = runCli(["import", "--fixture", fixturePath, "--repo", importRepo, "--json"]);
      expect(imported.status).toBe(0);
      expect(JSON.parse(imported.stdout).findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "brain-file-written",
            path: path.join(importRepo, "agent-brain.json")
          })
        ])
      );

      const apply = runCli([
        "apply",
        "--fixture",
        fixturePath,
        "--target-root",
        "/synthetic/target",
        "--json"
      ]);
      expect(apply.status).toBe(0);
      expect(JSON.parse(apply.stdout).findings[0]).toMatchObject({
        id: "apply.dry-run",
        path: "/synthetic/target",
        provenance: {
          operations: [
            expect.objectContaining({
              path: "/synthetic/target/skills/review/SKILL.md"
            })
          ]
        }
      });

      const verify = runCli([
        "verify",
        "--fixture",
        fixturePath,
        "--target-root",
        "/synthetic/target",
        "--json"
      ]);
      expect(verify.status).toBe(0);
      expect(JSON.parse(verify.stdout).findings[0]).toMatchObject({
        id: "verify.checked",
        path: "/synthetic/target"
      });

      const rollback = runCli(["rollback", "--json"]);
      expect(rollback.status).toBe(1);
      expect(JSON.parse(rollback.stdout)).toMatchObject({
        ok: false,
        error: {
          code: "snapshot_required"
        }
      });

      const conflict = runCli(["explain-conflict", `${process.env.HOME}/.codex/history.jsonl`, "--json"]);
      expect(conflict.status).toBe(0);
      expect(JSON.stringify(JSON.parse(conflict.stdout))).not.toContain(process.env.HOME);
      expect(JSON.parse(conflict.stdout).findings[0]).toMatchObject({
        id: "conflict.runtime-cache",
        path: "~/.codex/history.jsonl"
      });
    } finally {
      rmSync(importRepo, { recursive: true, force: true });
    }
  });

  it("fails closed when required public inputs are missing", () => {
    const doctor = runCli(["doctor", "--json"]);
    expect(doctor.status).toBe(0);
    expect(JSON.parse(doctor.stdout)).toMatchObject({ ok: true });
    expect(doctor.stdout).not.toContain("developer preview");
    expect(doctor.stdout).not.toContain("fixture_required");
    expect(doctor.stdout).not.toContain(process.env.HOME ?? "");

    const version = runCli(["--version"]);
    expect(version.status).toBe(0);
    expect(version.stdout).toMatch(/^@leonardsellem\/agent-brain \d+\.\d+\.\d+/);

    expect(JSON.parse(runCli(["import", "--fixture", fixturePath, "--json"]).stdout)).toMatchObject({
      ok: false,
      error: { code: "repo_required" }
    });
    expect(JSON.parse(runCli(["apply", "--fixture", fixturePath, "--json"]).stdout)).toMatchObject({
      ok: false,
      error: { code: "apply_requires_target" }
    });
    expect(JSON.parse(runCli(["verify", "--json"]).stdout)).toMatchObject({
      ok: false,
      error: { code: "verify_requires_target" }
    });
  });

  it("exercises a non-empty disposable live lifecycle through rollback and bootstrap", () => {
    const claudeRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-release-claude-"));
    const repo = mkdtempSync(path.join(os.tmpdir(), "agent-brain-release-repo-"));
    const targetRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-release-target-"));
    const bootstrapRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-release-bootstrap-"));
    const skillPath = path.join(claudeRoot, "skills/review/SKILL.md");

    try {
      mkdirSync(path.dirname(skillPath), { recursive: true });
      writeFileSync(skillPath, "# Release Review\n");

      const imported = runCli(["import", "--claude-root", claudeRoot, "--repo", repo, "--json"]);
      expect(imported.status).toBe(0);
      expect(readFileSync(path.join(repo, "packages/review/SKILL.md"), "utf8")).toBe("# Release Review\n");

      const dryRun = runCli([
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
      const dryRunReport = JSON.parse(dryRun.stdout);
      const applyFinding = dryRunReport.findings.find((finding: { id: string }) => finding.id === "apply.dry-run");
      expect(dryRun.status).toBe(0);
      expect(applyFinding.provenance.operations).toEqual([
        expect.objectContaining({
          path: path.join(targetRoot, "skills/review/SKILL.md"),
          content: "# Release Review\n"
        })
      ]);

      const applied = runCli([
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
        applyFinding.provenance.fingerprint,
        "--json"
      ]);
      const applyReport = JSON.parse(applied.stdout);
      expect(applied.status).toBe(0);
      expect(readFileSync(path.join(targetRoot, "skills/review/SKILL.md"), "utf8")).toBe("# Release Review\n");

      const verified = runCli([
        "verify",
        "--repo",
        repo,
        "--target-root",
        targetRoot,
        "--adapter",
        "claude-code",
        "--json"
      ]);
      expect(verified.status).toBe(0);

      const rolledBack = runCli([
        "rollback",
        "--snapshot",
        applyReport.findings[0].provenance.snapshotPath,
        "--target-root",
        targetRoot,
        "--json"
      ]);
      expect(rolledBack.status).toBe(0);
      expect(existsSync(path.join(targetRoot, "skills/review/SKILL.md"))).toBe(false);

      const bootstrapDryRun = runCli([
        "bootstrap",
        "--repo",
        repo,
        "--target-root",
        bootstrapRoot,
        "--adapter",
        "claude-code",
        "--profile",
        "profile.default",
        "--json"
      ]);
      const bootstrapReport = JSON.parse(bootstrapDryRun.stdout);
      expect(bootstrapDryRun.status).toBe(0);
      expect(bootstrapReport.findings[0].provenance.operations.length).toBeGreaterThan(0);
    } finally {
      rmSync(claudeRoot, { recursive: true, force: true });
      rmSync(repo, { recursive: true, force: true });
      rmSync(targetRoot, { recursive: true, force: true });
      rmSync(bootstrapRoot, { recursive: true, force: true });
    }
  });
});

function runCli(args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}
