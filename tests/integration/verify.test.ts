import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";
import { createVerifyCommand } from "../../src/commands/verify.js";

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
