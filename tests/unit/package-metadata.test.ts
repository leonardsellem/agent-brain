import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const packagePath = path.join(repoRoot, "package.json");
const packageLockPath = path.join(repoRoot, "package-lock.json");

type PackageJson = {
  name?: string;
  private?: boolean;
  description?: string;
  keywords?: string[];
  license?: string;
  repository?: { type?: string; url?: string };
  bugs?: { url?: string };
  homepage?: string;
  bin?: Record<string, string>;
  files?: string[];
  publishConfig?: { access?: string; registry?: string; tag?: string };
  engines?: { node?: string };
};

const readPackageJson = (): PackageJson => JSON.parse(readFileSync(packagePath, "utf8")) as PackageJson;

const readPackageLock = (): { packages?: Record<string, { version?: string }> } =>
  JSON.parse(readFileSync(packageLockPath, "utf8")) as { packages?: Record<string, { version?: string }> };

describe("npm package metadata", () => {
  it("uses the scoped launch package identity while preserving the CLI command", () => {
    const packageJson = readPackageJson();

    expect(packageJson.name).toBe("@leonardsellem/agent-brain");
    expect(packageJson.bin).toEqual({ "agent-brain": "./dist/cli.js" });
    expect(packageJson.engines?.node).toBe(">=20");
  });

  it("is publishable to the public npm registry with useful discovery metadata", () => {
    const packageJson = readPackageJson();

    expect(packageJson.private).not.toBe(true);
    expect(packageJson.description).toMatch(/git-backed package and profile manager/i);
    expect(packageJson.keywords).toEqual(
      expect.arrayContaining(["agent-brain", "claude-code", "codex", "ai-agents"])
    );
    expect(packageJson.license).toBe("MIT");
    expect(packageJson.repository).toEqual({
      type: "git",
      url: "git+https://github.com/leonardsellem/agent-brain.git"
    });
    expect(packageJson.bugs?.url).toBe("https://github.com/leonardsellem/agent-brain/issues");
    expect(packageJson.homepage).toBe("https://github.com/leonardsellem/agent-brain#readme");
    expect(packageJson.publishConfig).toEqual({
      access: "public",
      registry: "https://registry.npmjs.org/",
      tag: "latest"
    });
  });

  it("declares an intentional npm package file boundary", () => {
    const packageJson = readPackageJson();

    expect(packageJson.files).toEqual([
      "dist/",
      "README.md",
      "LICENSE",
      "docs/npm-release.md"
    ]);
    expect(packageJson.files).not.toEqual(
      expect.arrayContaining(["tests/", "docs/plans/", "docs/brainstorms/", ".brv/", "artifacts/", "tmp/"])
    );
  });

  it("keeps optional transitive package metadata complete for cross-platform npm ci", () => {
    const packageLock = readPackageLock();

    expect(packageLock.packages?.["node_modules/@emnapi/core"]?.version).toBe("1.10.0");
    expect(packageLock.packages?.["node_modules/@emnapi/runtime"]?.version).toBe("1.10.0");
  });
});
