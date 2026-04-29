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
});
