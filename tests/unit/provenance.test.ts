import { describe, expect, it } from "vitest";
import { describeProvenance, validateProvenance } from "../../src/core/provenance.js";
import type { Provenance } from "../../src/core/provenance.js";

describe("provenance", () => {
  it("keeps source, target, adapter, classification, and confidence explainable", () => {
    const provenance: Provenance = {
      sourceKind: "chezmoi",
      sourcePath: "/fixture/chezmoi/dot_claude/skills/plan",
      originalTarget: "/fixture/.claude/skills/plan",
      adapter: "claude-code",
      classification: "portable-source",
      confidence: 0.9
    };

    expect(validateProvenance(provenance)).toEqual([]);
    expect(describeProvenance(provenance)).toContain(
      "chezmoi -> claude-code portable-source"
    );
  });

  it("rejects missing provenance with exact field names", () => {
    expect(validateProvenance({ sourceKind: "home" })).toEqual([
      "sourcePath is required",
      "adapter is required",
      "classification is required",
      "confidence is required"
    ]);
  });
});
