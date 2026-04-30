import { describe, expect, it } from "vitest";
import { createSetupDiscovery } from "../../src/setup/discovery.js";
import type { ScannableFsPort } from "../../src/core/fs-port.js";

describe("setup discovery", () => {
  it("summarizes visible roots, symlink backing paths, import sources, and adapter targets", () => {
    const fs: ScannableFsPort = {
      root: "live",
      entries: [
        {
          path: "/home/.claude/skills",
          logicalPath: "~/.claude/skills",
          kind: "symlink",
          adapter: "claude-code",
          linkTarget: "/home/.config/dotstate/storage/Personal/.claude/skills",
          realPath: "/home/.config/dotstate/storage/Personal/.claude/skills"
        },
        {
          path: "/home/.claude/skills/review/SKILL.md",
          logicalPath: "~/.claude/skills/review/SKILL.md",
          kind: "file",
          adapter: "claude-code",
          realPath: "/home/.config/dotstate/storage/Personal/.claude/skills/review/SKILL.md"
        },
        {
          path: "/home/.agents/skills/review/SKILL.md",
          logicalPath: "~/.agents/skills/review/SKILL.md",
          kind: "file",
          adapter: "codex",
          realPath: "/home/.agents/skills/review/SKILL.md"
        }
      ]
    };

    const discovery = createSetupDiscovery(fs);

    expect(discovery.visibleRoots).toEqual(["~/.agents", "~/.claude"]);
    expect(discovery.symlinks).toEqual([
      {
        visiblePath: "~/.claude/skills",
        realPath: "/home/.config/dotstate/storage/Personal/.claude/skills",
        linkTarget: "/home/.config/dotstate/storage/Personal/.claude/skills",
        broken: false
      }
    ]);
    expect(discovery.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "dotstate",
          root: "/home/.config/dotstate"
        }),
        expect.objectContaining({
          kind: "home",
          root: "/home/.agents"
        })
      ])
    );
    expect(discovery.adapterTargets).toEqual([
      {
        adapter: "claude-code",
        visibleRoot: "~/.claude",
        confidence: 0.9
      },
      {
        adapter: "codex",
        visibleRoot: "~/.agents",
        confidence: 0.8
      }
    ]);
  });
});
