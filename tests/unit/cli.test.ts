import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";

describe("agent-brain CLI", () => {
  const commands = [
    "doctor",
    "import",
    "plan",
    "apply",
    "verify",
    "rollback",
    "explain-conflict"
  ];

  it.each(commands)("%s --help returns command purpose without live repo access", async (command) => {
    const cli = createCli();

    const result = await cli.run([command, "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(command);
    expect(result.stdout).not.toContain(process.env.HOME ?? "");
  });

  it("returns a readable suggestion list for unknown commands", async () => {
    const cli = createCli();

    const result = await cli.run(["docter"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command");
    expect(result.stderr).toContain("doctor");
  });

  it("returns a structured error envelope for malformed json-output requests", async () => {
    const cli = createCli();

    const result = await cli.run(["doctor", "--json", "--target-root"]);

    expect(result.exitCode).toBe(1);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "invalid_arguments"
      }
    });
  });

  it("passes fixture filesystem ports to command modules", async () => {
    const seenRoots: string[] = [];
    const cli = createCli({
      commands: {
        doctor: async (context) => {
          seenRoots.push(context.fs.root);
          return {
            ok: true,
            findings: [],
            summary: "fixture checked"
          };
        }
      },
      fs: { root: "/tmp/agent-brain-fixture" }
    });

    const result = await cli.run(["doctor"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("fixture checked");
    expect(seenRoots).toEqual(["/tmp/agent-brain-fixture"]);
  });

  it("loads --fixture JSON and passes it to command modules", async () => {
    const seenRoots: string[] = [];
    const cli = createCli({
      commands: {
        doctor: async (context) => {
          seenRoots.push(context.fs.root);
          return {
            ok: true,
            findings: [],
            summary: "fixture checked"
          };
        }
      }
    });

    const result = await cli.run(["doctor", "--fixture", "tests/fixtures/e2e-persona/scannable.json"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("fixture checked");
    expect(seenRoots).toEqual(["tests/fixtures/e2e-persona"]);
  });

  it("returns structured fixture errors before command execution", async () => {
    const cli = createCli({
      commands: {
        doctor: async () => {
          throw new Error("command should not run");
        }
      }
    });

    const result = await cli.run(["doctor", "--json", "--fixture", "tests/fixtures/e2e-persona/missing.json"]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "invalid_fixture"
      }
    });
  });
});
