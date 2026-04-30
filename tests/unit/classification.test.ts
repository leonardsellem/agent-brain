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

  it("uses logical adapter paths for classification while preserving physical paths in findings", () => {
    const result = classifyEntry({
      path: "/tmp/live-claude/skills/review/SKILL.md",
      logicalPath: "~/.claude/skills/review/SKILL.md",
      kind: "file",
      adapter: "claude-code"
    });

    expect(result).toMatchObject({
      path: "/tmp/live-claude/skills/review/SKILL.md",
      classification: "portable-source",
      role: "personal-skill"
    });
  });

  it("detects JSON-style quoted secret keys without echoing sampled secret content", () => {
    const result = classifyEntry({
      path: "/tmp/live-codex/auth.json",
      logicalPath: "~/.codex/auth.json",
      kind: "file",
      adapter: "codex",
      contentSample: "{\"token\":\"sk-test-secret-value\"}"
    });

    expect(result).toMatchObject({
      classification: "secret",
      findings: [
        expect.objectContaining({
          id: "secret-like-content",
          path: "/tmp/live-codex/auth.json",
          message: expect.not.stringContaining("sk-test-secret-value")
        })
      ]
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
