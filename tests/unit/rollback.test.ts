import { describe, expect, it } from "vitest";
import { createDryRun } from "../../src/apply/dry-run.js";
import { applyDryRun } from "../../src/apply/materializer.js";
import { rollbackSnapshot } from "../../src/apply/rollback.js";
import { createSnapshot } from "../../src/apply/snapshot.js";

describe("rollback", () => {
  it("restores files and symlinks from snapshot metadata", () => {
    const target = {
      files: { "/target/file.md": "before" },
      symlinks: { "/target/link": "/before" }
    };
    const dryRun = createDryRun(target, [
      { type: "update", path: "/target/file.md", content: "after" },
      { type: "symlink", path: "/target/link", to: "/after" }
    ]);
    const snapshot = createSnapshot(target, dryRun, "codex@0.1");

    applyDryRun(target, dryRun, dryRun.fingerprint);
    rollbackSnapshot(target, snapshot);

    expect(target.files["/target/file.md"]).toBe("before");
    expect(target.symlinks["/target/link"]).toBe("/before");
  });
});
