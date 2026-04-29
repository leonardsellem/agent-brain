import { describe, expect, it } from "vitest";
import { explainConflict } from "../../src/conflict/explain.js";

describe("conflict explanation", () => {
  it("classifies portable source conflicts by ownership and recommends source resolution", () => {
    expect(explainConflict({ path: "packages/review/SKILL.md" })).toMatchObject({
      classification: "portable-source",
      recommendation: "Resolve in Agent Brain package source, then regenerate targets"
    });
  });

  it("renders home-expanded paths as home-relative display paths", () => {
    const home = process.env.HOME;
    if (!home) {
      return;
    }

    expect(explainConflict({ path: `${home}/.codex/auth.json` })).toMatchObject({
      path: "~/.codex/auth.json",
      classification: "secret"
    });
  });

  it("recommends regenerating generated output instead of hand-merging", () => {
    expect(
      explainConflict({
        path: "/target/.codex/skills/review/SKILL.md",
        generated: true
      })
    ).toMatchObject({
      classification: "generated-target",
      recommendation: "Regenerate from canonical package/profile intent rather than hand-merging"
    });
  });

  it("explains unsafe shared-root topology, not just the conflicted file", () => {
    expect(
      explainConflict({
        path: "~/.codex/skills/review/SKILL.md",
        sharedRoot: {
          adapters: ["codex", "claude-code"],
          realPath: "/shared/skills"
        }
      })
    ).toMatchObject({
      classification: "unknown",
      risk: "shared-root",
      recommendation: "Separate physical target roots before resolving generated output conflicts"
    });
  });

  it("uses conservative recommendations for unknown paths", () => {
    expect(explainConflict({ path: "/mystery/file" })).toMatchObject({
      classification: "unknown",
      recommendation: "Inspect and classify before import, apply, or merge"
    });
  });
});
