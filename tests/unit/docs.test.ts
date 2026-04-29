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
    path: "docs/release-e2e-rehearsal.md",
    headings: [
      "## Persona",
      "## Evidence Protocol",
      "## Finding Taxonomy",
      "## Safety Boundary",
      "## Mission Script"
    ]
  },
  {
    path: "docs/release-live-e2e-rehearsal.md",
    headings: [
      "## Scope",
      "## Command Rehearsal",
      "## Requirement Trace",
      "## Safety Evidence",
      "## Remaining Release Checks"
    ]
  },
  {
    path: "docs/release-e2e-findings.md",
    headings: [
      "## Verdict",
      "## Evidence",
      "## Findings",
      "## Follow-Up"
    ]
  },
  {
    path: "docs/live-personal-npm-e2e-protocol.md",
    headings: [
      "## Scope",
      "## Ring 0 Readiness Gate",
      "## Ring 1 Non-Mutating npm Pass",
      "## Ring 2 Owner-Approved Live Mutation Pass",
      "## Private Artifact Handling",
      "## Finding Taxonomy",
      "## Go/No-Go Handoff"
    ]
  },
  {
    path: "docs/live-personal-npm-e2e-findings-template.md",
    headings: [
      "## Verdict",
      "## Environment",
      "## Ring 0 Readiness",
      "## Ring 1 Evidence",
      "## Ring 2 Decision",
      "## Findings",
      "## Follow-Up"
    ]
  },
  {
    path: "docs/live-personal-npm-e2e-findings.md",
    headings: [
      "## Verdict",
      "## Environment",
      "## Ring 0 Readiness",
      "## Ring 1 Evidence",
      "## Ring 2 Decision",
      "## Findings",
      "## Follow-Up"
    ]
  },
  {
    path: "docs/npm-release.md",
    headings: [
      "## Scope",
      "## Version Preparation",
      "## Publish Trigger",
      "## Trusted Publishing Setup",
      "## Release Evidence",
      "## Safety Boundary"
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

  it("keeps release rehearsal fixtures synthetic and documented", () => {
    const fixtureReadme = readFileSync(path.join(repoRoot, "tests/fixtures/e2e-persona/README.md"), "utf8");

    expect(fixtureReadme).toContain("messy but synthetic Claude Code and Codex setup");
    expect(fixtureReadme).toContain("must never contain copied live app state");
    expect(fixtureReadme).toContain("Fixture Map");
  });

  it("guards the personal live npm protocol safety gates", () => {
    const protocol = readFileSync(path.join(repoRoot, "docs/live-personal-npm-e2e-protocol.md"), "utf8");

    for (const phrase of [
      "tracked-root recoverability",
      "local-change status",
      "Computer Use-visible",
      "non-mutating",
      "fresh owner approval",
      "exact dry-run fingerprint",
      "baseline snapshot",
      "rollback or approved recovery evidence",
      "post-test diff inspection",
      "artifacts/live-personal-npm-e2e/"
    ]) {
      expect(protocol).toContain(phrase);
    }
  });

  it("guards the personal live findings template against raw evidence leakage", () => {
    const template = readFileSync(path.join(repoRoot, "docs/live-personal-npm-e2e-findings-template.md"), "utf8");

    for (const phrase of [
      "go/no-go verdict",
      "sanitized reproduction context",
      "raw screenshots",
      "terminal logs",
      "auth material",
      "must not be copied into this tracked template",
      "Ring 2 skipped",
      "release blocker",
      "trust gap"
    ]) {
      expect(template).toContain(phrase);
    }
  });

  it("keeps adjacent release docs aligned with the personal live protocol", () => {
    const releaseRehearsal = readFileSync(path.join(repoRoot, "docs/release-e2e-rehearsal.md"), "utf8");
    const liveRehearsal = readFileSync(path.join(repoRoot, "docs/release-live-e2e-rehearsal.md"), "utf8");
    const handoff = readFileSync(path.join(repoRoot, "docs/agent-handoff.md"), "utf8");
    const safetyModel = readFileSync(path.join(repoRoot, "docs/safety-model.md"), "utf8");

    expect(releaseRehearsal).toContain("[live personal npm E2E protocol](live-personal-npm-e2e-protocol.md)");
    expect(liveRehearsal).toContain("[live personal npm E2E protocol](live-personal-npm-e2e-protocol.md)");
    expect(handoff).toContain("[live personal npm E2E protocol](live-personal-npm-e2e-protocol.md)");
    expect(safetyModel).toContain("[live personal npm E2E protocol](live-personal-npm-e2e-protocol.md)");
    expect(handoff).not.toContain("live home scanning and live app-root mutation remain outside the release claim");
    expect(safetyModel).not.toContain("real app-root mutation remains deferred");
  });

  it("keeps the personal live findings report sanitized", () => {
    const findings = readFileSync(path.join(repoRoot, "docs/live-personal-npm-e2e-findings.md"), "utf8");

    expect(findings).toContain("go for the bounded personal-live canary release claim");
    expect(findings).toContain("Ring 1 result: passed");
    expect(findings).toContain("Ring 2 result: passed");
    expect(findings).toContain("Rollback status: proven");
    expect(findings).toContain("Node heap out of memory");
    expect(findings).toContain("terminal app access was unavailable");
    expect(findings).not.toContain("artifacts/live-personal-npm-e2e/20260429-225639-ring1");
  });
});
