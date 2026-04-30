import { spawnSync } from "node:child_process";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const cliPath = path.join(repoRoot, "dist/cli.js");

describe("setup CLI", () => {
  beforeAll(() => {
    const build = spawnSync("npm", ["run", "build"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(build.status, build.stderr).toBe(0);
  });

  it("exposes setup help without scanning live roots or leaking the home path", () => {
    const generalHelp = runCli(["--help"]);
    const setupHelp = runCli(["setup", "--help"]);

    expect(generalHelp.status).toBe(0);
    expect(generalHelp.stdout).toContain("setup");
    expect(generalHelp.stdout).toContain("guided setup");
    expect(generalHelp.stdout).not.toContain(process.env.HOME ?? "");

    expect(setupHelp.status).toBe(0);
    expect(setupHelp.stdout).toContain("agent-brain setup");
    expect(setupHelp.stdout).toContain("--json");
    expect(setupHelp.stdout).not.toContain(process.env.HOME ?? "");
  });

  it("reports a nonblocking confirmation-required state in json mode", () => {
    const setup = runCli(["setup", "--json"]);

    expect(setup.status).toBe(0);
    expect(setup.stderr).toBe("");
    expect(JSON.parse(setup.stdout)).toMatchObject({
      ok: true,
      findings: [
        expect.objectContaining({
          id: "setup.confirmation-required",
          severity: "info"
        })
      ]
    });
    expect(setup.stdout).not.toContain(process.env.HOME ?? "");
  });
});

function runCli(args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}
