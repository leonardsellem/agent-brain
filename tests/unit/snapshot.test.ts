import { describe, expect, it } from "vitest";
import { createSnapshot } from "../../src/apply/snapshot.js";
import { createDryRun } from "../../src/apply/dry-run.js";

describe("snapshot", () => {
  it("captures file content, symlink targets, adapter version, and dry-run fingerprint", () => {
    const target = {
      files: { "/target/file.md": "before" },
      symlinks: { "/target/link": "/before" }
    };
    const dryRun = createDryRun(target, [
      { type: "update", path: "/target/file.md", content: "after" },
      { type: "symlink", path: "/target/link", to: "/after" }
    ]);

    const snapshot = createSnapshot(target, dryRun, "codex@0.1");

    expect(snapshot).toMatchObject({
      adapterVersion: "codex@0.1",
      dryRunFingerprint: dryRun.fingerprint,
      entries: [
        { path: "/target/file.md", kind: "file", content: "before" },
        { path: "/target/link", kind: "symlink", target: "/before" }
      ]
    });
  });
});
