import { describe, expect, it } from "vitest";
import { createDryRun } from "../../src/apply/dry-run.js";
import { applyWithSnapshot } from "../../src/apply/materializer.js";
import { rollbackSnapshot } from "../../src/apply/rollback.js";
import { createCli } from "../../src/cli.js";
import { createApplyCommand } from "../../src/commands/apply.js";
import { createRollbackCommand } from "../../src/commands/rollback.js";

describe("apply and rollback", () => {
  it("creates a snapshot, mutates fixture target, and rolls back to original topology", () => {
    const target = {
      files: { "/target/skill/SKILL.md": "old" },
      symlinks: { "/target/current": "/target/skill" }
    };
    const dryRun = createDryRun(target, [
      { type: "update", path: "/target/skill/SKILL.md", content: "new" },
      { type: "symlink", path: "/target/current", to: "/target/generated" }
    ]);

    const result = applyWithSnapshot(target, dryRun, dryRun.fingerprint, "claude-code@0.1");

    expect(result.snapshot.id).toMatch(/^snap-/);
    expect(target.files["/target/skill/SKILL.md"]).toBe("new");

    rollbackSnapshot(target, result.snapshot);

    expect(target).toEqual({
      files: { "/target/skill/SKILL.md": "old" },
      symlinks: { "/target/current": "/target/skill" }
    });
  });

  it("fails closed when public apply has no fixture-backed target context", async () => {
    const cli = createCli({
      commands: {
        apply: createApplyCommand()
      }
    });

    const result = await cli.run(["apply", "--json"]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "apply_requires_target"
      }
    });
  });

  it("reports fixture-backed dry-run evidence without mutating when no confirmation is supplied", async () => {
    const cli = createCli({
      commands: {
        apply: createApplyCommand()
      }
    });

    const result = await cli.run([
      "apply",
      "--json",
      "--fixture",
      "tests/fixtures/e2e-persona/scannable.json",
      "--target-root",
      "/synthetic/target"
    ]);
    const report = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(report.summary).toContain("dry-run");
    expect(report.findings).toEqual([
      expect.objectContaining({
        id: "apply.dry-run",
        path: "/synthetic/target",
        provenance: expect.objectContaining({
          fingerprint: expect.stringMatching(/^sha256:/),
          operations: expect.any(Array)
        })
      })
    ]);
    expect(JSON.stringify(report)).not.toContain("snapshot");
  });

  it("rejects mismatched apply confirmation fingerprints", async () => {
    const cli = createCli({
      commands: {
        apply: createApplyCommand()
      }
    });

    const result = await cli.run([
      "apply",
      "--json",
      "--fixture",
      "tests/fixtures/e2e-persona/scannable.json",
      "--target-root",
      "/synthetic/target",
      "--confirm-fingerprint",
      "sha256:wrong"
    ]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "fingerprint_mismatch"
      }
    });
  });

  it("applies fixture-backed operations only with a matching fingerprint", async () => {
    const cli = createCli({
      commands: {
        apply: createApplyCommand()
      }
    });

    const dryRun = await cli.run([
      "apply",
      "--json",
      "--fixture",
      "tests/fixtures/e2e-persona/scannable.json",
      "--target-root",
      "/synthetic/target"
    ]);
    const fingerprint = JSON.parse(dryRun.stdout).findings[0].provenance.fingerprint;
    const applied = await cli.run([
      "apply",
      "--json",
      "--fixture",
      "tests/fixtures/e2e-persona/scannable.json",
      "--target-root",
      "/synthetic/target",
      "--confirm-fingerprint",
      fingerprint
    ]);

    expect(applied.exitCode).toBe(0);
    expect(JSON.parse(applied.stdout)).toMatchObject({
      ok: true,
      findings: [
        expect.objectContaining({
          id: "apply.snapshot-created",
          path: "/synthetic/target",
          provenance: expect.objectContaining({
            fingerprint,
            snapshotId: expect.stringMatching(/^snap-/),
            changedPaths: expect.arrayContaining(["/synthetic/target/skills/review/SKILL.md"])
          })
        })
      ]
    });
  });

  it("fails closed when public rollback has no snapshot metadata", async () => {
    const cli = createCli({
      commands: {
        rollback: createRollbackCommand()
      }
    });

    const result = await cli.run(["rollback", "--json"]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "snapshot_required"
      }
    });
  });
});
