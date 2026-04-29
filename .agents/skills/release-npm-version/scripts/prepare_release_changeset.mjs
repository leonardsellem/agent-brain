#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const usage = `Usage: prepare_release_changeset.mjs <major|minor> [--repo <path>] [--summary <text>] [--write]`;

const args = process.argv.slice(2);
const releaseType = args.shift();

if (!["major", "minor"].includes(releaseType ?? "")) {
  console.error(usage);
  process.exit(2);
}

let repoRoot = process.cwd();
let summary;
let write = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--repo") {
    repoRoot = path.resolve(args[++index] ?? "");
  } else if (arg === "--summary") {
    summary = args[++index];
  } else if (arg === "--write") {
    write = true;
  } else {
    console.error(`Unknown argument: ${arg}`);
    console.error(usage);
    process.exit(2);
  }
}

const packagePath = path.join(repoRoot, "package.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

if (packageJson.name !== "@leonardsellem/agent-brain") {
  throw new Error(`Expected package name @leonardsellem/agent-brain, found ${packageJson.name ?? "<missing>"}`);
}

const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(packageJson.version);
if (!match) {
  throw new Error(`Expected semver package version, found ${packageJson.version ?? "<missing>"}`);
}

const [, majorRaw, minorRaw] = match;
const major = Number(majorRaw);
const minor = Number(minorRaw);
const nextVersion = releaseType === "major" ? `${major + 1}.0.0` : `${major}.${minor + 1}.0`;
const changesetDir = path.join(repoRoot, ".changeset");
const changesetPath = path.join(changesetDir, `agent-brain-${nextVersion.replaceAll(".", "-")}.md`);
const changesetSummary = summary ?? `Prepare @leonardsellem/agent-brain ${nextVersion} release.`;
const changesetBody = `---\n"@leonardsellem/agent-brain": ${releaseType}\n---\n\n${changesetSummary}\n`;

if (write) {
  mkdirSync(changesetDir, { recursive: true });
  if (existsSync(changesetPath)) {
    throw new Error(`Refusing to overwrite existing changeset: ${path.relative(repoRoot, changesetPath)}`);
  }
  writeFileSync(changesetPath, changesetBody, "utf8");
}

console.log(
  JSON.stringify(
    {
      packageName: packageJson.name,
      currentVersion: packageJson.version,
      releaseType,
      nextVersion,
      changesetPath: path.relative(repoRoot, changesetPath),
      wroteChangeset: write
    },
    null,
    2
  )
);
