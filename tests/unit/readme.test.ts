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
      "## Contributing",
      "## Development",
      "## Roadmap"
    ]) {
      expect(readme).toContain(heading);
    }
  });

  it("presents npm as the launch-user install path before contributor setup", () => {
    const readme = readFileSync(readmePath, "utf8");
    const npmInstallIndex = readme.indexOf("npm install -g @leonardsellem/agent-brain");
    const contributorIndex = readme.indexOf("## Development");

    expect(readme).toContain("https://www.npmjs.com/package/@leonardsellem/agent-brain");
    expect(readme).toContain("agent-brain --help");
    expect(npmInstallIndex).toBeGreaterThan(-1);
    expect(contributorIndex).toBeGreaterThan(-1);
    expect(npmInstallIndex).toBeLessThan(contributorIndex);
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

  it("documents the compiled fixture-backed rehearsal workflow safely", () => {
    const readme = readFileSync(readmePath, "utf8");

    expect(readme).toContain("node dist/cli.js doctor --fixture tests/fixtures/e2e-persona/scannable.json");
    expect(readme).toContain("node dist/cli.js import --fixture tests/fixtures/e2e-persona/scannable.json --repo tmp/agent-brain-preview");
    expect(readme).toContain("node dist/cli.js apply --fixture tests/fixtures/e2e-persona/scannable.json --target-root /synthetic/target --json");
    expect(readme).toContain("agent-brain import --claude-root tmp/live-claude --repo tmp/agent-brain-live --json");
    expect(readme).toContain("FINGERPRINT=");
    expect(readme).toContain("SNAPSHOT=");
    expect(readme).toContain("agent-brain bootstrap --repo tmp/agent-brain-live --target-root tmp/live-target-b --adapter claude-code --profile profile.default --json");
    expect(readme).not.toContain("sha256:from-dry-run");
    expect(readme).not.toContain("tmp/live-source");
    expect(readme).toContain("node dist/cli.js explain-conflict '~/.codex/history.jsonl'");
    expect(readme).not.toContain("node dist/cli.js explain-conflict ~/.codex/history.jsonl");
  });

  it("documents the live safety gates before live migration commands", () => {
    const readme = readFileSync(readmePath, "utf8");

    for (const phrase of [
      "explicit roots",
      "dry-run fingerprint",
      "baseline snapshot",
      "materialization lock",
      "verify",
      "rollback",
      "bootstrap"
    ]) {
      expect(readme).toContain(phrase);
    }
  });

  it("points cautious users to the personal live protocol after the disposable-root guidance", () => {
    const readme = readFileSync(readmePath, "utf8");
    const disposableGuidanceIndex = readme.indexOf("Run against a disposable or explicitly approved setup first");
    const protocolLinkIndex = readme.indexOf("[personal live npm E2E protocol](https://github.com/leonardsellem/agent-brain/blob/dev/docs/live-personal-npm-e2e-protocol.md)");

    expect(disposableGuidanceIndex).toBeGreaterThan(-1);
    expect(protocolLinkIndex).toBeGreaterThan(-1);
    expect(protocolLinkIndex).toBeGreaterThan(disposableGuidanceIndex);
    expect(readme).not.toContain("agent-brain apply --repo ~/.agent-brain");
  });

  it("welcomes contributors through the dedicated contributing guide", () => {
    const readme = readFileSync(readmePath, "utf8");
    const contributingIndex = readme.indexOf("## Contributing");
    const developmentIndex = readme.indexOf("## Development");

    expect(readme).toContain("[Contributing guide](https://github.com/leonardsellem/agent-brain/blob/dev/CONTRIBUTING.md)");
    expect(contributingIndex).toBeGreaterThan(-1);
    expect(developmentIndex).toBeGreaterThan(-1);
    expect(contributingIndex).toBeLessThan(developmentIndex);
  });
});
