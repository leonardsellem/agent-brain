import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";
import { createExplainConflictCommand } from "../../src/commands/explain-conflict.js";

describe("explain-conflict command", () => {
  it("returns ownership language for conflicted files", async () => {
    const cli = createCli({
      commands: {
        "explain-conflict": createExplainConflictCommand()
      }
    });

    const result = await cli.run(["explain-conflict", "packages/review/SKILL.md", "--json"]);

    expect(JSON.parse(result.stdout).findings[0]).toMatchObject({
      id: "conflict.portable-source",
      category: "portable-source",
      path: "packages/review/SKILL.md"
    });
  });

  it("does not leak shell-expanded home paths in public output", async () => {
    const home = process.env.HOME;
    if (!home) {
      return;
    }
    const cli = createCli({
      commands: {
        "explain-conflict": createExplainConflictCommand()
      }
    });

    const result = await cli.run(["explain-conflict", `${home}/.codex/auth.json`, "--json"]);
    const report = JSON.parse(result.stdout);

    expect(JSON.stringify(report)).not.toContain(home);
    expect(report.findings[0]).toMatchObject({
      id: "conflict.secret",
      path: "~/.codex/auth.json"
    });
  });
});
