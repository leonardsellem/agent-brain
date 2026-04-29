import { describe, expect, it } from "vitest";
import { detectImportSources } from "../../src/import/source-detectors.js";

describe("import source detectors", () => {
  it("detects dotstate, chezmoi, stow, bare git, and unmanaged home inputs", () => {
    const sources = detectImportSources([
      { path: "/repo/.dotstate/config.yaml", kind: "file" },
      { path: "/home/.local/share/chezmoi/dot_claude", kind: "directory" },
      { path: "/home/.stow/agent-tools/.claude", kind: "directory" },
      { path: "/home/.cfg/config", kind: "file", gitBare: true },
      { path: "/home/.claude/skills/review/SKILL.md", kind: "file" }
    ]);

    expect(sources.map((source) => source.kind)).toEqual([
      "dotstate",
      "chezmoi",
      "stow",
      "bare-git",
      "home"
    ]);
  });

  it("deduplicates source roots", () => {
    const sources = detectImportSources([
      { path: "/home/.claude/skills/a/SKILL.md", kind: "file" },
      { path: "/home/.claude/skills/b/SKILL.md", kind: "file" }
    ]);

    expect(sources).toEqual([
      {
        kind: "home",
        root: "/home/.claude",
        confidence: 0.7
      }
    ]);
  });
});
