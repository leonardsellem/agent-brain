import { describe, expect, it } from "vitest";
import { claudeCodeAdapter } from "../../../src/adapters/claude-code.js";
import { adapterVocabulary } from "../../../src/adapters/index.js";

describe("Claude Code adapter", () => {
  it("identifies personal, project, plugin, settings, MCP, and subagent surfaces", () => {
    expect(claudeCodeAdapter.classifyPath("~/.claude/settings.json")).toMatchObject({
      classification: "native-owned",
      role: "user-settings"
    });
    expect(claudeCodeAdapter.classifyPath("~/.claude/skills/review/SKILL.md")).toMatchObject({
      classification: "portable-source",
      role: "personal-skill"
    });
    expect(claudeCodeAdapter.classifyPath("skills/review/SKILL.md")).toMatchObject({
      classification: "portable-source",
      role: "personal-skill"
    });
    expect(claudeCodeAdapter.classifyPath(".claude/agents/reviewer.md")).toMatchObject({
      classification: "portable-source",
      role: "project-subagent"
    });
    expect(claudeCodeAdapter.classifyPath("~/.claude.json")).toMatchObject({
      classification: "secret",
      role: "user-mcp-and-session-state"
    });
    expect(claudeCodeAdapter.classifyPath(".mcp.json")).toMatchObject({
      classification: "portable-source",
      role: "project-mcp"
    });
  });

  it("uses the shared ownership vocabulary", () => {
    expect(claudeCodeAdapter.vocabulary).toEqual(adapterVocabulary);
  });

  it("reports unreadable roots as adapter diagnostics", () => {
    expect(claudeCodeAdapter.verifyTarget({ readable: false, root: "/nope" })).toEqual([
      {
        id: "claude-code.unreadable-root",
        severity: "high",
        category: "unknown",
        path: "/nope",
        message: "Claude Code target root is unreadable"
      }
    ]);
  });
});
