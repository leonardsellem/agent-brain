import { describe, expect, it } from "vitest";
import { createDryRun } from "../../src/apply/dry-run.js";
import { applyDryRun } from "../../src/apply/materializer.js";

describe("materializer", () => {
  it("refuses apply without matching confirmation fingerprint", () => {
    const target = { files: {}, symlinks: {} };
    const dryRun = createDryRun(target, [
      { type: "create", path: "/target/new.md", content: "new" }
    ]);

    expect(() => applyDryRun(target, dryRun, "sha256:nope")).toThrow(
      "confirmation fingerprint does not match dry run"
    );
    expect(target.files).toEqual({});
  });

  it("preserves unmanaged files unless the apply plan owns them", () => {
    const target = {
      files: { "/target/unmanaged.md": "keep" },
      symlinks: {}
    };
    const dryRun = createDryRun(target, [
      { type: "create", path: "/target/generated.md", content: "generated" }
    ]);

    applyDryRun(target, dryRun, dryRun.fingerprint);

    expect(target.files).toMatchObject({
      "/target/unmanaged.md": "keep",
      "/target/generated.md": "generated"
    });
  });
});
