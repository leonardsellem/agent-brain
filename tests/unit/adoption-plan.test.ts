import { describe, expect, it } from "vitest";
import { createAdoptionPlan } from "../../src/import/adoption-plan.js";
import type { ScannableEntry } from "../../src/core/fs-port.js";

describe("adoption plans", () => {
  it("groups portable items into packages and profiles while preserving exclusions", () => {
    const plan = createAdoptionPlan(entries([
      { path: "~/.claude/skills/review/SKILL.md", kind: "file", adapter: "claude-code" },
      { path: "~/.codex/history.jsonl", kind: "file", adapter: "codex" },
      { path: "~/.codex/auth.json", kind: "file", adapter: "codex" }
    ]));

    expect(plan.packages).toEqual([
      expect.objectContaining({
        id: "pkg.review",
        files: ["packages/review/SKILL.md"]
      })
    ]);
    expect(plan.profile.packages).toEqual(["pkg.review"]);
    expect(plan.exclusions.map((exclusion) => exclusion.classification)).toEqual([
      "runtime-cache",
      "secret"
    ]);
  });

  it("does not bake machine app-home paths into package files", () => {
    const plan = createAdoptionPlan(entries([
      { path: "/machine-a/.claude/skills/review/SKILL.md", kind: "file", adapter: "claude-code" }
    ]));

    expect(plan.packages[0]?.files).toEqual(["packages/review/SKILL.md"]);
    expect(plan.packages[0]?.provenance.sourcePath).toBe("/machine-a/.claude/skills/review/SKILL.md");
  });

  it("reports logical package conflicts instead of choosing silently", () => {
    const plan = createAdoptionPlan(entries([
      { path: "~/.claude/skills/review/SKILL.md", kind: "file", adapter: "claude-code" },
      { path: "~/.codex/skills/review/SKILL.md", kind: "file", adapter: "codex" }
    ]));

    expect(plan.conflicts).toEqual([
      expect.objectContaining({
        id: "package-name-conflict",
        packageId: "pkg.review"
      })
    ]);
  });

  it("rejects excluded secret material without explicit override", () => {
    const plan = createAdoptionPlan(entries([
      {
        path: "~/.claude/skills/review/SKILL.md",
        kind: "file",
        adapter: "claude-code",
        contentSample: "token=sk-test"
      }
    ]));

    expect(plan.packages).toEqual([]);
    expect(plan.rejections[0]).toMatchObject({
      path: "~/.claude/skills/review/SKILL.md",
      reason: "secret material requires explicit override"
    });
  });
});

function entries(values: ScannableEntry[]): ScannableEntry[] {
  return values;
}
