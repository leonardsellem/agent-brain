import { describe, expect, it } from "vitest";
import { createDryRun } from "../../src/apply/dry-run.js";

describe("dry run", () => {
  it("reports creates, updates, moves, and symlink changes without mutating fixtures", () => {
    const target = {
      files: {
        "/target/existing.md": "old",
        "/target/move-from.md": "move me"
      },
      symlinks: {
        "/target/link": "/old"
      }
    };

    const dryRun = createDryRun(target, [
      { type: "create", path: "/target/new.md", content: "new" },
      { type: "update", path: "/target/existing.md", content: "new" },
      { type: "move", path: "/target/move-from.md", to: "/target/move-to.md" },
      { type: "symlink", path: "/target/link", to: "/new" }
    ]);

    expect(dryRun.operations.map((operation) => operation.type)).toEqual([
      "create",
      "update",
      "move",
      "symlink"
    ]);
    expect(dryRun.fingerprint).toMatch(/^sha256:/);
    expect(target.files["/target/existing.md"]).toBe("old");
    expect(target.symlinks["/target/link"]).toBe("/old");
  });
});
