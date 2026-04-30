import { describe, expect, it } from "vitest";
import { createSetupClassificationSummary } from "../../src/setup/classification-summary.js";
import type { ScannableEntry } from "../../src/core/fs-port.js";

describe("setup classification summary", () => {
  it("groups portable candidates, default exclusions, and unknown review items", () => {
    const summary = createSetupClassificationSummary(entries([
      {
        path: "~/.claude/skills/review/SKILL.md",
        kind: "file",
        adapter: "claude-code"
      },
      {
        path: "~/.codex/auth.json",
        kind: "file",
        adapter: "codex"
      },
      {
        path: "~/.codex/plugins/cache",
        kind: "directory",
        adapter: "codex",
        scanStatus: "skipped"
      },
      {
        path: "~/.claude/debug/latest",
        kind: "symlink",
        linkTarget: "/missing/debug",
        broken: true
      }
    ]));

    expect(summary.counts).toEqual({
      portableCandidates: 1,
      adapterProfileCandidates: 0,
      defaultExclusions: 2,
      unknownReviewItems: 1,
      classificationFindings: 1
    });
    expect(summary.portableCandidates[0]).toMatchObject({
      path: "~/.claude/skills/review/SKILL.md",
      role: "personal-skill"
    });
    expect(summary.defaultExclusions.map((item) => item.classification)).toEqual(["secret", "runtime-cache"]);
    expect(summary.unknownReviewItems[0]).toMatchObject({
      path: "~/.claude/debug/latest",
      role: "broken-symlink"
    });
  });

  it("keeps zero-package summaries actionable when discovery only finds exclusions and unknowns", () => {
    const summary = createSetupClassificationSummary(entries([
      {
        path: "~/.claude/skills/review/SKILL.md",
        kind: "file",
        adapter: "claude-code",
        contentSample: "OPENAI_API_KEY=sk-test"
      },
      {
        path: "~/.codex/history.jsonl",
        kind: "file",
        adapter: "codex"
      },
      {
        path: "~/.agents/skills",
        kind: "symlink",
        linkTarget: "/missing/skills",
        broken: true
      }
    ]));

    expect(summary.counts.portableCandidates).toBe(0);
    expect(summary.defaultExclusions.map((item) => item.role)).toEqual(["secret-like-content", "history"]);
    expect(summary.unknownReviewItems).toEqual([
      expect.objectContaining({
        path: "~/.agents/skills",
        role: "broken-symlink"
      })
    ]);
  });
});

function entries(values: ScannableEntry[]): ScannableEntry[] {
  return values;
}
