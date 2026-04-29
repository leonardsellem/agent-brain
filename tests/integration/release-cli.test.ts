import { mkdtempSync, rmSync } from "node:fs";
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

  it("exercises the public fixture-backed developer-preview workflow", () => {
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
    expect(JSON.parse(runCli(["doctor", "--json"]).stdout)).toMatchObject({
      ok: false,
      error: { code: "fixture_required" }
    });
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
});

function runCli(args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}
