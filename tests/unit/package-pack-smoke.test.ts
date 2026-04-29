import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const packagePath = path.join(repoRoot, "package.json");

describe("npm package smoke check", () => {
  it("is exposed as a package script", () => {
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["pack:smoke"]).toBe("node scripts/pack-smoke.mjs");
  });

  it("packs the installable CLI and rejects local-only package contents", () => {
    const result = spawnSync("npm", ["run", "pack:smoke"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("agent-brain pack smoke passed");
    expect(result.stdout).toContain("dist/cli.js");
    expect(result.stdout).not.toMatch(/tests\/|docs\/plans\/|docs\/brainstorms\/|\.brv\/|artifacts\/|tmp\//);
  });
});
