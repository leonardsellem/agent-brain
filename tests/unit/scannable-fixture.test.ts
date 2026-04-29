import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadScannableFixture } from "../../src/core/scannable-fixture.js";

describe("scannable fixture loader", () => {
  it("loads a valid structured scannable fixture", () => {
    const fixturePath = writeFixture({
      root: "/fixture",
      entries: [
        { path: "~/.claude/skills/review/SKILL.md", kind: "file", adapter: "claude-code" },
        { path: "~/.codex/skills", kind: "directory", adapters: ["codex"], realPath: "/fixture/shared" },
        { path: "~/.codex/auth.json", kind: "file", adapter: "codex", contentSample: "token: fake-token" }
      ]
    });

    expect(loadScannableFixture(fixturePath)).toEqual({
      root: "/fixture",
      entries: [
        { path: "~/.claude/skills/review/SKILL.md", kind: "file", adapter: "claude-code" },
        { path: "~/.codex/skills", kind: "directory", adapters: ["codex"], realPath: "/fixture/shared" },
        { path: "~/.codex/auth.json", kind: "file", adapter: "codex", contentSample: "token: fake-token" }
      ]
    });
  });

  it("accepts an empty fixture without scanning the real filesystem", () => {
    const fixturePath = writeFixture({ root: "/fixture", entries: [] });

    expect(loadScannableFixture(fixturePath)).toEqual({
      root: "/fixture",
      entries: []
    });
  });

  it("rejects entries missing required fields", () => {
    const fixturePath = writeFixture({
      root: "/fixture",
      entries: [{ kind: "file", adapter: "codex" }]
    });

    expect(() => loadScannableFixture(fixturePath)).toThrow("entries[0].path is required");
  });

  it("rejects unsupported adapter names", () => {
    const fixturePath = writeFixture({
      root: "/fixture",
      entries: [{ path: "~/.unknown/config", kind: "file", adapter: "unknown-agent" }]
    });

    expect(() => loadScannableFixture(fixturePath)).toThrow("entries[0].adapter is unsupported");
  });
});

function writeFixture(value: unknown): string {
  const fixturePath = path.join(mkdtempSync(path.join(os.tmpdir(), "agent-brain-fixture-")), "scannable.json");
  writeFileSync(fixturePath, `${JSON.stringify(value, null, 2)}\n`);
  return fixturePath;
}
