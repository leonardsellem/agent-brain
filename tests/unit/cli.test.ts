import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";

describe("agent-brain CLI", () => {
  const commands = [
    "doctor",
    "import",
    "plan",
    "apply",
    "bootstrap",
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

  it("shows command-specific options in help output", async () => {
    const cli = createCli();

    const doctor = await cli.run(["doctor", "--help"]);
    const apply = await cli.run(["apply", "--help"]);
    const bootstrap = await cli.run(["bootstrap", "--help"]);

    expect(doctor.stdout).toContain("default read-only diagnosis");
    expect(doctor.stdout).toContain("--claude-root");
    expect(doctor.stdout).toContain("--codex-root");
    expect(doctor.stdout).toContain("--source-root");
    expect(doctor.stdout).toContain("--json");
    expect(apply.stdout).toContain("--target-root");
    expect(apply.stdout).toContain("--confirm-fingerprint");
    expect(apply.stdout).toContain("--adapter");
    expect(bootstrap.stdout).toContain("--confirm-fingerprint");
  });

  it("returns package identity for version requests", async () => {
    const cli = createCli();

    const result = await cli.run(["--version"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/^@leonardsellem\/agent-brain \d+\.\d+\.\d+/);
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

  it("keeps every public command surface free of developer-preview fixture guardrails", async () => {
    const cli = createCli();
    const scenarios = [
      ["doctor", "--json"],
      ["import", "--json"],
      ["plan", "--json"],
      ["apply", "--target-root", "/tmp/agent-brain-target", "--json"],
      ["bootstrap", "--target-root", "/tmp/agent-brain-target", "--json"],
      ["verify", "--target-root", "/tmp/agent-brain-target", "--json"],
      ["rollback", "--json"],
      ["explain-conflict", "--json"]
    ];

    for (const args of scenarios) {
      const result = await cli.run(args);
      const output = `${result.stdout}\n${result.stderr}`;

      expect(output, args.join(" ")).not.toMatch(/developer[- ]preview/i);
      expect(output, args.join(" ")).not.toContain("fixture_required");
      expect(output, args.join(" ")).not.toMatch(/requires a scannable filesystem fixture/i);
    }
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
