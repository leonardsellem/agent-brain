import { describe, expect, it } from "vitest";
import { classifyEntry } from "../../src/core/classification.js";

describe("ownership classification", () => {
  it("reports unsafe shared Claude/Codex physical roots with both targets", () => {
    const result = classifyEntry({
      path: "~/.codex/skills",
      realPath: "/shared/.claude/skills",
      kind: "directory",
      adapters: ["codex", "claude-code"]
    });

    expect(result.findings).toEqual([
      expect.objectContaining({
        id: "shared-root",
        severity: "high",
        message: expect.stringContaining("codex and claude-code share")
      })
    ]);
  });

  it("separates portable source from runtime cache and auth material", () => {
    expect(
      classifyEntry({
        path: "~/.claude/skills/review/SKILL.md",
        kind: "file",
        adapter: "claude-code"
      }).classification
    ).toBe("portable-source");

    expect(
      classifyEntry({
        path: "~/.codex/history.jsonl",
        kind: "file",
        adapter: "codex"
      }).classification
    ).toBe("runtime-cache");

    expect(
      classifyEntry({
        path: "~/.codex/auth.json",
        kind: "file",
        adapter: "codex"
      }).classification
    ).toBe("secret");
  });

  it("treats secret-like content in portable paths as excluded pending override", () => {
    const result = classifyEntry({
      path: "~/.claude/skills/review/SKILL.md",
      kind: "file",
      adapter: "claude-code",
      contentSample: "OPENAI_API_KEY=sk-test"
    });

    expect(result).toMatchObject({
      classification: "secret",
      recommendation: "Exclude until a user explicitly classifies safe portable source"
    });
  });

  it("records broken symlink targets as unknown and risky", () => {
    const result = classifyEntry({
      path: "~/.codex/skills",
      kind: "symlink",
      linkTarget: "/missing/skills",
      broken: true
    });

    expect(result.classification).toBe("unknown");
    expect(result.findings[0]).toMatchObject({
      id: "broken-symlink",
      path: "~/.codex/skills"
    });
  });
});
