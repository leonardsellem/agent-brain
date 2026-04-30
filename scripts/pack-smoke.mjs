#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    shell: false
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        result.error?.message,
        result.stdout?.trim(),
        result.stderr?.trim()
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return result;
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const tempRoot = mkdtempSync(path.join(tmpdir(), "agent-brain-pack-smoke-"));

try {
  run("npm", ["run", "build"]);

  const pack = run("npm", ["pack", "--json", "--pack-destination", tempRoot]);
  const [packResult] = JSON.parse(pack.stdout);
  assert(packResult, "npm pack did not return package metadata");

  const files = packResult.files.map((file) => file.path).sort();
  const forbiddenPrefixes = ["tests/", "docs/plans/", "docs/brainstorms/", ".brv/", "artifacts/", "tmp/"];

  for (const requiredPath of ["package.json", "README.md", "LICENSE", "dist/cli.js"]) {
    assert(files.includes(requiredPath), `Packed package is missing ${requiredPath}`);
  }

  for (const file of files) {
    assert(
      forbiddenPrefixes.every((prefix) => !file.startsWith(prefix)),
      `Packed package includes local-only path ${file}`
    );
  }

  const packedFileSet = new Set(files);
  const readme = readFileSync(path.join(repoRoot, "README.md"), "utf8");
  const readmeTargets = [
    ...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g),
    ...readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)
  ].map((match) => match[1]);

  for (const target of readmeTargets) {
    if (/^(https?:|mailto:|#)/.test(target)) {
      continue;
    }

    const packedPath = target.split("#")[0];
    assert(packedFileSet.has(packedPath), `README links to ${target}, but ${packedPath} is not packed`);
  }

  const tarball = path.join(tempRoot, packResult.filename);
  assert(existsSync(tarball), `npm pack did not create ${packResult.filename}`);

  run("npm", ["init", "-y"], { cwd: tempRoot });
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], { cwd: tempRoot });

  const installedBin = path.join(tempRoot, "node_modules", ".bin", "agent-brain");
  const help = run(installedBin, ["--help"], { cwd: tempRoot });
  assert(help.stdout.includes("agent-brain <command>"), "Installed CLI did not render help");
  assert(help.stdout.includes("doctor"), "Installed CLI help did not include commands");

  console.log("agent-brain pack smoke passed");
  console.log(files.join("\n"));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
