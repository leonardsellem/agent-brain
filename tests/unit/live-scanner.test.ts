import { describe, expect, it } from "vitest";
import { createDefaultDiagnosisScannableFsPort } from "../../src/import/live-scanner.js";

describe("live scanner", () => {
  it("redacts home paths from missing default diagnosis roots and errors", () => {
    const originalHome = process.env.HOME;
    process.env.HOME = "/tmp/agent-brain-missing-home";

    try {
      const scanned = createDefaultDiagnosisScannableFsPort();
      const serialized = JSON.stringify(scanned);

      expect(scanned.entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "~/.claude",
            kind: "unreadable",
            error: expect.stringContaining("~/.claude")
          }),
          expect.objectContaining({
            path: "~/.codex",
            kind: "unreadable",
            error: expect.stringContaining("~/.codex")
          }),
          expect.objectContaining({
            path: "~/.agents",
            kind: "unreadable",
            error: expect.stringContaining("~/.agents")
          })
        ])
      );
      expect(serialized).not.toContain("/tmp/agent-brain-missing-home");
    } finally {
      process.env.HOME = originalHome;
    }
  });
});
