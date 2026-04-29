import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const readmePath = path.join(repoRoot, "README.md");

describe("README", () => {
  it("presents the core open-source repository sections", () => {
    const readme = readFileSync(readmePath, "utf8");

    for (const heading of [
      "## Why Agent Brain",
      "## What It Manages",
      "## Command Surface",
      "## Safety Model",
      "## Development",
      "## Roadmap"
    ]) {
      expect(readme).toContain(heading);
    }
  });

  it("keeps published links portable", () => {
    const readme = readFileSync(readmePath, "utf8");
    const markdownLinks = Array.from(readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)).map((match) => match[1]);

    expect(readme).not.toMatch(/\/Users\/|iCloud~md~obsidian|file:\/\//);

    for (const href of markdownLinks) {
      if (/^(https?:|mailto:|#)/.test(href)) {
        continue;
      }

      expect(existsSync(path.join(repoRoot, href))).toBe(true);
    }
  });

  it("matches the repository license file", () => {
    const readme = readFileSync(readmePath, "utf8");

    if (existsSync(path.join(repoRoot, "LICENSE"))) {
      expect(readme).toContain("[MIT License](LICENSE)");
    }
  });

  it("documents the compiled fixture-backed preview workflow safely", () => {
    const readme = readFileSync(readmePath, "utf8");

    expect(readme).toContain("node dist/cli.js doctor --fixture tests/fixtures/e2e-persona/scannable.json");
    expect(readme).toContain("node dist/cli.js import --fixture tests/fixtures/e2e-persona/scannable.json --repo tmp/agent-brain-preview");
    expect(readme).toContain("node dist/cli.js apply --fixture tests/fixtures/e2e-persona/scannable.json --target-root /synthetic/target --json");
    expect(readme).toContain("node dist/cli.js explain-conflict '~/.codex/history.jsonl'");
    expect(readme).not.toContain("node dist/cli.js explain-conflict ~/.codex/history.jsonl");
  });
});
