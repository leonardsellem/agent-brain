import { describe, expect, it } from "vitest";
import { createAdoptionPlan } from "../../src/import/adoption-plan.js";
import { writeBrainRepo } from "../../src/import/brain-writer.js";

describe("brain writer", () => {
  it("writes canonical package, profile, provenance, and exclusions files", () => {
    const plan = createAdoptionPlan([
      { path: "~/.claude/skills/review/SKILL.md", kind: "file", adapter: "claude-code" },
      { path: "~/.codex/history.jsonl", kind: "file", adapter: "codex" }
    ]);

    const result = writeBrainRepo(plan);

    expect(Object.keys(result.files).sort()).toEqual([
      "agent-brain.json",
      "packages/review/package.json",
      "profiles/default.json"
    ]);
    expect(JSON.parse(result.files["agent-brain.json"])).toMatchObject({
      schemaVersion: 1,
      exclusions: [
        expect.objectContaining({
          classification: "runtime-cache"
        })
      ]
    });
  });

  it("is idempotent when run twice against existing files", () => {
    const plan = createAdoptionPlan([
      { path: "~/.claude/skills/review/SKILL.md", kind: "file", adapter: "claude-code" }
    ]);

    const first = writeBrainRepo(plan);
    const second = writeBrainRepo(plan, first.files);

    expect(second.files).toEqual(first.files);
    expect(second.changed).toBe(false);
  });
});
