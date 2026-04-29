import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const packagePath = path.join(repoRoot, "package.json");

describe("package binary contract", () => {
  it("points the agent-brain bin at the compiled CLI help surface", () => {
    const build = spawnSync("npm", ["run", "build"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(build.status, build.stderr).toBe(0);

    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      bin?: Record<string, string>;
    };
    const binTarget = packageJson.bin?.["agent-brain"];

    expect(binTarget).toBe("./dist/cli.js");

    const absoluteBinTarget = path.join(repoRoot, binTarget!.replace(/^\.\//, ""));
    expect(existsSync(absoluteBinTarget)).toBe(true);

    const result = spawnSync(process.execPath, [absoluteBinTarget, "--help"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("agent-brain <command>");
    expect(result.stdout).toContain("doctor");
  });
});
