import { describe, expect, it } from "vitest";
import { createDryRun } from "../../src/apply/dry-run.js";
import { applyWithSnapshot } from "../../src/apply/materializer.js";
import { rollbackSnapshot } from "../../src/apply/rollback.js";

describe("apply and rollback", () => {
  it("creates a snapshot, mutates fixture target, and rolls back to original topology", () => {
    const target = {
      files: { "/target/skill/SKILL.md": "old" },
      symlinks: { "/target/current": "/target/skill" }
    };
    const dryRun = createDryRun(target, [
      { type: "update", path: "/target/skill/SKILL.md", content: "new" },
      { type: "symlink", path: "/target/current", to: "/target/generated" }
    ]);

    const result = applyWithSnapshot(target, dryRun, dryRun.fingerprint, "claude-code@0.1");

    expect(result.snapshot.id).toMatch(/^snap-/);
    expect(target.files["/target/skill/SKILL.md"]).toBe("new");

    rollbackSnapshot(target, result.snapshot);

    expect(target).toEqual({
      files: { "/target/skill/SKILL.md": "old" },
      symlinks: { "/target/current": "/target/skill" }
    });
  });
});
