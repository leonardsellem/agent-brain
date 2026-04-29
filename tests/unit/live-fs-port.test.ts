import { mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanLiveRoot } from "../../src/core/live-fs-port.js";

describe("live filesystem port", () => {
  it("represents files, directories, and symlinks from a disposable root", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-live-"));
    mkdirSync(path.join(root, "skills/review"), { recursive: true });
    writeFileSync(path.join(root, "skills/review/SKILL.md"), "# Review\n");
    symlinkSync("skills/review/SKILL.md", path.join(root, "review-link.md"));

    const scanned = scanLiveRoot({ root, adapter: "claude-code" });

    expect(scanned.root).toBe(root);
    expect(scanned.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: path.join(root, "skills"),
          kind: "directory",
          adapter: "claude-code",
          realPath: realpathSync(path.join(root, "skills"))
        }),
        expect.objectContaining({
          path: path.join(root, "skills/review/SKILL.md"),
          kind: "file",
          adapter: "claude-code",
          contentSample: "# Review\n"
        }),
        expect.objectContaining({
          path: path.join(root, "review-link.md"),
          kind: "symlink",
          adapter: "claude-code",
          linkTarget: "skills/review/SKILL.md",
          realPath: realpathSync(path.join(root, "skills/review/SKILL.md"))
        })
      ])
    );
  });

  it("returns structured unreadable entries for missing roots and broken symlinks", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-live-"));
    symlinkSync("missing-target.md", path.join(root, "broken-link.md"));

    expect(scanLiveRoot({ root: path.join(root, "missing"), adapter: "codex" }).entries).toEqual([
      expect.objectContaining({
        path: path.join(root, "missing"),
        kind: "unreadable",
        adapter: "codex"
      })
    ]);

    expect(scanLiveRoot({ root, adapter: "codex" }).entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: path.join(root, "broken-link.md"),
          kind: "symlink",
          adapter: "codex",
          linkTarget: "missing-target.md",
          broken: true
        })
      ])
    );
  });

  it("does not mutate files while scanning", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-live-"));
    const filePath = path.join(root, "config.toml");
    writeFileSync(filePath, "model = \"gpt\"\n");

    scanLiveRoot({ root, adapter: "codex" });

    expect(readFileSync(filePath, "utf8")).toBe("model = \"gpt\"\n");
  });

  it("prunes cache-like directories while keeping a visible skipped entry", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-live-"));
    mkdirSync(path.join(root, ".codex/plugins/cache/large-plugin"), { recursive: true });
    mkdirSync(path.join(root, ".codex/worktrees/project/.claude/skills/review"), { recursive: true });
    writeFileSync(path.join(root, ".codex/plugins/cache/large-plugin/SKILL.md"), "# Cached\n");
    writeFileSync(path.join(root, ".codex/worktrees/project/.claude/skills/review/SKILL.md"), "# Worktree\n");
    writeFileSync(path.join(root, ".codex/config.toml"), "model = \"gpt\"\n");

    const scanned = scanLiveRoot({ root, adapter: "codex" });

    expect(scanned.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: path.join(root, ".codex/plugins/cache"),
          kind: "directory",
          scanStatus: "skipped"
        }),
        expect.objectContaining({
          path: path.join(root, ".codex/worktrees"),
          kind: "directory",
          scanStatus: "skipped"
        }),
        expect.objectContaining({
          path: path.join(root, ".codex/config.toml"),
          kind: "file",
          contentSample: "model = \"gpt\"\n"
        })
      ])
    );
    expect(scanned.entries).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: path.join(root, ".codex/plugins/cache/large-plugin/SKILL.md")
        }),
        expect.objectContaining({
          path: path.join(root, ".codex/worktrees/project/.claude/skills/review/SKILL.md")
        })
      ])
    );
  });

  it("limits file samples without loading entire file content", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-live-"));
    const filePath = path.join(root, "large.txt");
    writeFileSync(filePath, `${"a".repeat(1024)}b`);

    const scanned = scanLiveRoot({ root, contentSampleBytes: 8 });

    expect(scanned.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: filePath,
          contentSample: "aaaaaaaa"
        })
      ])
    );
  });

  it("caps oversized sample requests to the actual file size", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-live-"));
    const filePath = path.join(root, "small.txt");
    writeFileSync(filePath, "small");

    const scanned = scanLiveRoot({ root, contentSampleBytes: Number.MAX_SAFE_INTEGER });

    expect(scanned.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: filePath,
          contentSample: "small"
        })
      ])
    );
  });

  it("caps oversized sample requests to a safe maximum", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-live-"));
    const filePath = path.join(root, "large.txt");
    writeFileSync(filePath, "a".repeat(2 * 1024 * 1024));

    const scanned = scanLiveRoot({ root, contentSampleBytes: Number.MAX_SAFE_INTEGER });
    const entry = scanned.entries.find((candidate) => candidate.path === filePath);

    expect(entry?.contentSample?.length).toBe(1024 * 1024);
  });

  it("stops traversal at the configured entry limit", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-live-"));
    writeFileSync(path.join(root, "a.txt"), "a");
    writeFileSync(path.join(root, "b.txt"), "b");
    writeFileSync(path.join(root, "c.txt"), "c");

    const scanned = scanLiveRoot({ root, maxEntries: 2 });

    expect(scanned.entries).toHaveLength(3);
    expect(scanned.entries.at(-1)).toEqual(
      expect.objectContaining({
        path: root,
        kind: "unreadable",
        scanStatus: "truncated"
      })
    );
  });
});
