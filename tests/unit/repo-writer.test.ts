import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { writeRepoFiles } from "../../src/core/repo-writer.js";

describe("repo writer", () => {
  it("refuses to write absolute or traversing output paths", () => {
    const repo = mkdtempSync(path.join(os.tmpdir(), "agent-brain-writer-"));

    expect(() => writeRepoFiles(repo, { "../outside.json": "{}\n" })).toThrow("outside repo destination");
    expect(() => writeRepoFiles(repo, { "/outside.json": "{}\n" })).toThrow("outside repo destination");
  });
});
