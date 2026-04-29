import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { MaterializationLock } from "../../src/core/model.js";
import { readMaterializationLock, validateLockAdapter, writeMaterializationLock } from "../../src/materialize/lock-store.js";

describe("materialization lock store", () => {
  it("writes and reads deterministic lock metadata", () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-lock-"));
    const lock: MaterializationLock = {
      schemaVersion: 1,
      entries: [
        {
          adapter: "claude-code",
          packageId: "pkg.review",
          targetPath: "/target/skills/review/SKILL.md",
          contentHash: "sha256:abc",
          generated: true
        }
      ]
    };

    const written = writeMaterializationLock(repoRoot, lock);
    const loaded = readMaterializationLock(repoRoot);

    expect(written.path).toBe(path.join(repoRoot, ".agent-brain", "materialization-lock.json"));
    expect(readFileSync(written.path, "utf8")).toBe(`${JSON.stringify(lock, null, 2)}\n`);
    expect(loaded).toEqual({
      ok: true,
      path: written.path,
      lock
    });
  });

  it("fails closed for malformed locks and adapter mismatches", () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "agent-brain-lock-"));
    writeMaterializationLock(repoRoot, {
      schemaVersion: 1,
      entries: [
        {
          adapter: "codex",
          packageId: "pkg.review",
          targetPath: "/target/skills/review/SKILL.md",
          contentHash: "sha256:abc",
          generated: true
        }
      ]
    });

    const loaded = readMaterializationLock(repoRoot);

    expect(loaded.ok).toBe(true);
    expect(validateLockAdapter(loaded.lock!, "claude-code")).toEqual({
      ok: false,
      errors: ["materialization lock contains codex entries for claude-code apply"]
    });
  });
});
