import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";

describe("live diagnosis", () => {
  it("scans explicit disposable roots without mutating them", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-live-diagnosis-"));
    const sharedSkills = path.join(root, "shared-skills");
    const dotstate = path.join(root, ".dotstate/storage/Personal/.claude/skills/review");
    const codexRoot = path.join(root, ".codex");
    mkdirSync(sharedSkills, { recursive: true });
    mkdirSync(dotstate, { recursive: true });
    mkdirSync(codexRoot, { recursive: true });
    writeFileSync(path.join(sharedSkills, "SKILL.md"), "# Shared Review\n");
    writeFileSync(path.join(dotstate, "SKILL.md"), "# Dotstate Review\n");
    writeFileSync(path.join(codexRoot, "auth.json"), "token = \"sk-test-secret-value\"\n");

    const claudeRoot = path.join(root, ".claude");
    symlinkSync(sharedSkills, claudeRoot);
    symlinkSync(sharedSkills, path.join(codexRoot, "skills"));

    const cli = createCli();
    const result = await cli.run([
      "doctor",
      "--claude-root",
      claudeRoot,
      "--codex-root",
      codexRoot,
      "--source-root",
      path.join(root, ".dotstate"),
      "--json"
    ]);
    const report = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "shared-root",
          severity: "high"
        }),
        expect.objectContaining({
          id: "import-source",
          category: "source",
          provenance: expect.objectContaining({
            sourceKind: "dotstate"
          })
        }),
        expect.objectContaining({
          id: "secret-like-content",
          category: "secret",
          path: path.join(codexRoot, "auth.json")
        })
      ])
    );
    expect(report.summary).toContain("paths scanned");
  });

  it("reports missing live roots as unreadable findings", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-live-diagnosis-"));
    const missingRoot = path.join(root, ".claude");

    const cli = createCli();
    const result = await cli.run(["doctor", "--claude-root", missingRoot, "--json"]);
    const report = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "unreadable-path",
          path: missingRoot
        })
      ])
    );
  });

  it("reports bounded live scans instead of recursing through cache folders", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-live-diagnosis-"));
    const codexRoot = path.join(root, ".codex");
    mkdirSync(path.join(codexRoot, "plugins/cache/large-plugin"), { recursive: true });
    writeFileSync(path.join(codexRoot, "plugins/cache/large-plugin/SKILL.md"), "# Cached\n");
    writeFileSync(path.join(codexRoot, "config.toml"), "model = \"gpt\"\n");

    const cli = createCli();
    const result = await cli.run(["doctor", "--codex-root", codexRoot, "--json"]);
    const report = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "scan.skipped-directory",
          severity: "medium",
          path: path.join(codexRoot, "plugins/cache")
        })
      ])
    );
    expect(result.stdout).not.toContain("large-plugin/SKILL.md");
  });
});
