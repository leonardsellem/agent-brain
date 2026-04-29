import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";
import { createImportCommand, createPlanCommand } from "../../src/commands/import.js";
import type { ScannableFsPort } from "../../src/core/fs-port.js";

describe("import and plan commands", () => {
  it("plans without writing and reports portable and excluded entries", async () => {
    const fs: ScannableFsPort = {
      root: "/fixture",
      entries: [
        { path: "~/.claude/skills/review/SKILL.md", kind: "file", adapter: "claude-code" },
        { path: "~/.codex/auth.json", kind: "file", adapter: "codex" }
      ]
    };
    const cli = createCli({
      fs,
      commands: {
        import: createImportCommand(),
        plan: createPlanCommand()
      }
    });

    const plan = await cli.run(["plan", "--json"]);

    expect(JSON.parse(plan.stdout)).toMatchObject({
      ok: true,
      summary: "1 packages, 1 exclusions, 0 conflicts, 1 rejections",
      findings: [
        expect.objectContaining({
          id: "import.rejected",
          path: "~/.codex/auth.json"
        }),
        expect.objectContaining({
          id: "import.excluded",
          path: "~/.codex/auth.json"
        })
      ]
    });
  });

  it("requires an explicit repo destination before import writes", async () => {
    const cli = createCli({
      fs: fixtureFs([{ path: "~/.claude/skills/review/SKILL.md", kind: "file", adapter: "claude-code" }]),
      commands: {
        import: createImportCommand()
      }
    });

    const imported = await cli.run(["import", "--json"]);

    expect(imported.exitCode).toBe(1);
    expect(JSON.parse(imported.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "repo_required"
      }
    });
  });

  it("imports portable source into canonical files under the chosen repo destination", async () => {
    const repo = mkdtempSync(path.join(os.tmpdir(), "agent-brain-repo-"));
    const cli = createCli({
      fs: fixtureFs([{ path: "~/.claude/skills/review/SKILL.md", kind: "file", adapter: "claude-code" }]),
      commands: {
        import: createImportCommand()
      }
    });

    const imported = await cli.run(["import", "--json", "--repo", repo]);

    expect(imported.exitCode).toBe(0);
    expect(JSON.parse(imported.stdout).findings).toEqual([
      expect.objectContaining({
        id: "brain-file-written",
        path: path.join(repo, "agent-brain.json")
      }),
      expect.objectContaining({
        id: "brain-file-written",
        path: path.join(repo, "packages/review/package.json")
      }),
      expect.objectContaining({
        id: "brain-file-written",
        path: path.join(repo, "profiles/default.json")
      })
    ]);
    expect(existsSync(path.join(repo, "agent-brain.json"))).toBe(true);
    expect(readFileSync(path.join(repo, "packages/review/package.json"), "utf8")).toContain("\"pkg.review\"");
  });
});

function fixtureFs(entries: ScannableFsPort["entries"]): ScannableFsPort {
  return {
    root: "/fixture",
    entries
  };
}
