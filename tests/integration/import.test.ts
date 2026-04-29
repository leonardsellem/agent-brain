import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";
import { createImportCommand, createPlanCommand } from "../../src/commands/import.js";
import type { ScannableFsPort } from "../../src/core/fs-port.js";

describe("import and plan commands", () => {
  it("plans without writing and imports portable source into canonical files", async () => {
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
    const imported = await cli.run(["import", "--json"]);

    expect(JSON.parse(plan.stdout)).toMatchObject({
      ok: true,
      summary: "1 packages, 1 exclusions, 0 conflicts"
    });
    expect(JSON.parse(imported.stdout).findings).toEqual([
      expect.objectContaining({
        id: "brain-file-written",
        path: "agent-brain.json"
      }),
      expect.objectContaining({
        id: "brain-file-written",
        path: "packages/review/package.json"
      }),
      expect.objectContaining({
        id: "brain-file-written",
        path: "profiles/default.json"
      })
    ]);
  });
});
