import { describe, expect, it } from "vitest";
import { codexAdapter } from "../../../src/adapters/codex.js";
import { detectSharedRootRisk } from "../../../src/adapters/index.js";

describe("Codex adapter", () => {
  it("identifies user config, trusted project config, skills, plugins, agents, hooks, and memory/runtime surfaces", () => {
    expect(codexAdapter.classifyPath("~/.codex/config.toml")).toMatchObject({
      classification: "native-owned",
      role: "user-config"
    });
    expect(codexAdapter.classifyPath(".codex/config.toml")).toMatchObject({
      classification: "portable-source",
      role: "trusted-project-config"
    });
    expect(codexAdapter.classifyPath("~/.agents/skills/review/SKILL.md")).toMatchObject({
      classification: "portable-source",
      role: "user-skill"
    });
    expect(codexAdapter.classifyPath("~/.codex/plugins/cache/example/plugin.json")).toMatchObject({
      classification: "runtime-cache",
      role: "plugin-cache"
    });
    expect(codexAdapter.classifyPath("~/.codex/history.jsonl")).toMatchObject({
      classification: "runtime-cache",
      role: "history"
    });
    expect(codexAdapter.classifyPath("AGENTS.md")).toMatchObject({
      classification: "portable-source",
      role: "project-instructions"
    });
  });

  it("reports symlinked Codex skills pointing into a Claude-owned directory as shared-root risk", () => {
    const findings = detectSharedRootRisk([
      {
        adapter: "codex",
        path: "~/.codex/skills",
        realPath: "/Users/example/.claude/skills"
      },
      {
        adapter: "claude-code",
        path: "~/.claude/skills",
        realPath: "/Users/example/.claude/skills"
      }
    ]);

    expect(findings).toEqual([
      expect.objectContaining({
        id: "shared-root",
        severity: "high",
        category: "risk",
        message: expect.stringContaining("codex and claude-code share")
      })
    ]);
  });
});
