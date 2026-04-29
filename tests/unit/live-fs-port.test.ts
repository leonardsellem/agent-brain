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
});
