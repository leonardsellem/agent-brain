import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
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
    expect(JSON.parse(setup.stdout).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "setup.confirmation-required",
          severity: "info"
        })
      ])
    );
    expect(setup.stdout).not.toContain(process.env.HOME ?? "");
  });

  it("discovers disposable symlinked dotstate-backed roots and agents without mutation", () => {
    const home = mkdtempSync(path.join(os.tmpdir(), "agent-brain-setup-home-"));
    const claudeSkill = path.join(home, ".config/dotstate/storage/Personal/.claude/skills/review/SKILL.md");
    const codexRoot = path.join(home, ".codex");
    const agentsSkill = path.join(home, ".agents/skills/helper/SKILL.md");
    mkdirSync(path.dirname(claudeSkill), { recursive: true });
    mkdirSync(path.join(codexRoot, "plugins/cache/large-plugin"), { recursive: true });
    mkdirSync(path.dirname(agentsSkill), { recursive: true });
    writeFileSync(claudeSkill, "# Dotstate Review\n");
    writeFileSync(path.join(codexRoot, "auth.json"), "token = \"sk-test-secret-value\"\n");
    writeFileSync(path.join(codexRoot, "plugins/cache/large-plugin/SKILL.md"), "# Cached\n");
    writeFileSync(agentsSkill, "# Agent Helper\n");
    mkdirSync(path.join(home, ".claude"), { recursive: true });
    symlinkSync(
      path.join(home, ".config/dotstate/storage/Personal/.claude/skills"),
      path.join(home, ".claude/skills")
    );

    const beforeClaudeSkill = readFileSync(claudeSkill, "utf8");
    const beforeAgentsSkill = readFileSync(agentsSkill, "utf8");
    const setup = runCli(["setup", "--json"], { HOME: home });
    const report = JSON.parse(setup.stdout);
    const discovery = report.findings.find((finding: { id: string }) => finding.id === "setup.discovery");
    const summary = report.findings.find((finding: { id: string }) => finding.id === "setup.classification-summary");

    expect(setup.status).toBe(0);
    expect(discovery).toMatchObject({
      provenance: {
        visibleRoots: expect.arrayContaining(["~/.agents", "~/.claude", "~/.codex"]),
        sources: expect.arrayContaining([
          expect.objectContaining({
            kind: "dotstate",
            root: "~/.config/dotstate"
          }),
          expect.objectContaining({
            kind: "home",
            root: "~/.agents"
          })
        ]),
        symlinks: expect.arrayContaining([
          expect.objectContaining({
            visiblePath: "~/.claude/skills",
            realPath: "~/.config/dotstate/storage/Personal/.claude/skills",
            broken: false
          })
        ]),
        adapterTargets: expect.arrayContaining([
          expect.objectContaining({
            adapter: "claude-code",
            visibleRoot: "~/.claude"
          }),
          expect.objectContaining({
            adapter: "codex",
            visibleRoot: "~/.agents"
          })
        ])
      }
    });
    expect(JSON.stringify(report)).not.toContain(home);
    expect(JSON.stringify(report)).not.toContain("large-plugin/SKILL.md");
    expect(summary).toMatchObject({
      message: expect.stringContaining("portable candidates"),
      provenance: {
        counts: expect.objectContaining({
          portableCandidates: expect.any(Number),
          defaultExclusions: expect.any(Number),
          unknownReviewItems: expect.any(Number)
        }),
        defaultExclusions: expect.arrayContaining([
          expect.objectContaining({
            path: "~/.codex/auth.json",
            classification: "secret"
          }),
          expect.objectContaining({
            path: "~/.codex/plugins/cache",
            classification: "runtime-cache"
          })
        ])
      }
    });
    expect(readFileSync(claudeSkill, "utf8")).toBe(beforeClaudeSkill);
    expect(readFileSync(agentsSkill, "utf8")).toBe(beforeAgentsSkill);
    expect(existsSync(path.join(home, ".agent-brain"))).toBe(false);
  });

  it("does not write the canonical repo before import confirmation", () => {
    const home = mkdtempSync(path.join(os.tmpdir(), "agent-brain-setup-home-"));
    const repo = path.join(home, ".agent-brain");
    const skillPath = path.join(home, ".claude/skills/review/SKILL.md");
    mkdirSync(path.dirname(skillPath), { recursive: true });
    writeFileSync(skillPath, "# Review\n");

    const setup = runCli(["setup", "--repo", repo, "--json"], { HOME: home });

    expect(setup.status).toBe(0);
    expect(JSON.parse(setup.stdout).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "setup.import-confirmation-required",
          path: repo
        })
      ])
    );
    expect(existsSync(path.join(repo, "agent-brain.json"))).toBe(false);
    expect(readFileSync(skillPath, "utf8")).toBe("# Review\n");
  });

  it("writes confirmed import to the default repo without mutating live roots", () => {
    const home = mkdtempSync(path.join(os.tmpdir(), "agent-brain-setup-home-"));
    const skillPath = path.join(home, ".claude/skills/review/SKILL.md");
    const authPath = path.join(home, ".codex/auth.json");
    mkdirSync(path.dirname(skillPath), { recursive: true });
    mkdirSync(path.dirname(authPath), { recursive: true });
    writeFileSync(skillPath, "# Review\n");
    writeFileSync(authPath, "token = \"sk-test-secret-value\"\n");

    const setup = runCli(["setup", "--confirm-import", "--json"], { HOME: home });
    const repo = path.join(home, ".agent-brain");

    expect(setup.status).toBe(0);
    expect(JSON.parse(setup.stdout).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "setup.import-written",
          path: path.join(repo, "agent-brain.json")
        }),
        expect.objectContaining({
          id: "setup.import-written",
          path: path.join(repo, "profiles/default.json")
        }),
        expect.objectContaining({
          id: "setup.import-written",
          path: path.join(repo, "packages/review/SKILL.md")
        })
      ])
    );
    expect(readFileSync(path.join(repo, "packages/review/SKILL.md"), "utf8")).toBe("# Review\n");
    expect(existsSync(path.join(repo, "packages/auth/package.json"))).toBe(false);
    expect(readFileSync(skillPath, "utf8")).toBe("# Review\n");
    expect(readFileSync(authPath, "utf8")).toBe("token = \"sk-test-secret-value\"\n");
  });

  it("backs up selected targets and requires exact fingerprint before live rewrite", () => {
    const home = mkdtempSync(path.join(os.tmpdir(), "agent-brain-setup-home-"));
    const repo = path.join(home, ".agent-brain");
    const targetRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-setup-target-"));
    const skillPath = path.join(home, ".claude/skills/review/SKILL.md");
    mkdirSync(path.dirname(skillPath), { recursive: true });
    writeFileSync(skillPath, "# Review\n");

    const dryRun = runCli([
      "setup",
      "--confirm-import",
      "--repo",
      repo,
      "--target-root",
      targetRoot,
      "--adapter",
      "claude-code",
      "--json"
    ], { HOME: home });
    const dryRunReport = JSON.parse(dryRun.stdout);
    const applyDryRun = dryRunReport.findings.find((finding: { id: string }) => finding.id === "apply.dry-run");
    const backup = dryRunReport.findings.find((finding: { id: string }) => finding.id === "setup.backup-created");

    expect(dryRun.status).toBe(0);
    expect(backup).toEqual(
      expect.objectContaining({
        path: targetRoot,
        provenance: expect.objectContaining({
          backupPath: expect.stringContaining(".agent-brain/backups/")
        })
      })
    );
    expect(applyDryRun.provenance.operations).toEqual([
      expect.objectContaining({
        path: path.join(targetRoot, "skills/review/SKILL.md"),
        content: "# Review\n"
      })
    ]);
    expect(existsSync(path.join(targetRoot, "skills/review/SKILL.md"))).toBe(false);

    const refused = runCli([
      "setup",
      "--confirm-import",
      "--repo",
      repo,
      "--target-root",
      targetRoot,
      "--adapter",
      "claude-code",
      "--confirm-fingerprint",
      "sha256:wrong",
      "--json"
    ], { HOME: home });
    expect(refused.status).toBe(1);
    expect(existsSync(path.join(targetRoot, "skills/review/SKILL.md"))).toBe(false);

    const applied = runCli([
      "setup",
      "--confirm-import",
      "--repo",
      repo,
      "--target-root",
      targetRoot,
      "--adapter",
      "claude-code",
      "--confirm-fingerprint",
      applyDryRun.provenance.fingerprint,
      "--json"
    ], { HOME: home });
    const appliedReport = JSON.parse(applied.stdout);

    expect(applied.status).toBe(0);
    expect(readFileSync(path.join(targetRoot, "skills/review/SKILL.md"), "utf8")).toBe("# Review\n");
    expect(appliedReport.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "apply.snapshot-created"
        }),
        expect.objectContaining({
          id: "verify.checked",
          path: targetRoot
        }),
        expect.objectContaining({
          id: "setup.recovery-guidance",
          path: targetRoot,
          recommendation: expect.stringContaining("agent-brain rollback"),
          provenance: expect.objectContaining({
            backupPath: expect.stringContaining(".agent-brain/backups/"),
            rollbackCommand: expect.stringContaining("agent-brain rollback")
          })
        })
      ])
    );
  });
});

function runCli(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env
    },
    encoding: "utf8"
  });
}
