import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveContainedPath, safeRelativePath } from "../../src/core/path-safety.js";

describe("path safety", () => {
  it("resolves relative output paths inside an approved root", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-path-"));

    expect(resolveContainedPath(root, "packages/review/SKILL.md")).toBe(
      path.join(root, "packages/review/SKILL.md")
    );
    expect(safeRelativePath("profiles/default.json")).toBe("profiles/default.json");
  });

  it("refuses absolute, traversing, and sibling-prefix paths", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-brain-path-"));
    const siblingPrefix = `${root}-sibling/file.json`;

    expect(() => safeRelativePath("/absolute.json")).toThrow("relative path");
    expect(() => safeRelativePath("../outside.json")).toThrow("path traversal");
    expect(() => resolveContainedPath(root, "../outside.json")).toThrow("outside approved root");
    expect(() => resolveContainedPath(root, siblingPrefix)).toThrow("outside approved root");
  });
});
