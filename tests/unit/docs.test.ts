import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");

const docs = [
  {
    path: "docs/architecture.md",
    headings: [
      "## Product Boundary",
      "## Core Model",
      "## System Flow",
      "## Design Principles",
      "## Extension Points"
    ]
  },
  {
    path: "docs/adapter-contract.md",
    headings: [
      "## Responsibilities",
      "## Ownership Vocabulary",
      "## Adapter Interface",
      "## MVP Adapters",
      "## Drift Policy"
    ]
  },
  {
    path: "docs/safety-model.md",
    headings: [
      "## Safety Goals",
      "## Transaction Lifecycle",
      "## Snapshot and Rollback",
      "## Exclusion Policy",
      "## Operator Checklist"
    ]
  },
  {
    path: "docs/agent-handoff.md",
    headings: [
      "## Current Posture",
      "## Start of Session",
      "## Development Loop",
      "## Verification and Handoff",
      "## Durable Memory"
    ]
  },
  {
    path: "AGENTS.md",
    headings: [
      "## Product Boundary",
      "## Engineering Rules",
      "## Documentation Standards",
      "## Safety Rules",
      "## Handoff Requirements"
    ]
  }
];

describe("companion documentation", () => {
  it("keeps the companion docs at README-level structure", () => {
    for (const doc of docs) {
      const content = readFileSync(path.join(repoRoot, doc.path), "utf8");

      for (const heading of doc.headings) {
        expect(content, `${doc.path} should include ${heading}`).toContain(heading);
      }
    }
  });

  it("uses only portable, resolvable repository links", () => {
    for (const doc of docs) {
      const content = readFileSync(path.join(repoRoot, doc.path), "utf8");
      const markdownLinks = Array.from(content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)).map((match) => match[1]);

      expect(content, `${doc.path} should not reference local-only paths`).not.toMatch(
        /\/Users\/|iCloud~md~obsidian|file:\/\//
      );

      for (const href of markdownLinks) {
        if (/^(https?:|mailto:|#)/.test(href)) {
          continue;
        }

        expect(existsSync(path.join(repoRoot, path.dirname(doc.path), href)), `${doc.path} links to ${href}`).toBe(
          true
        );
      }
    }
  });
});
