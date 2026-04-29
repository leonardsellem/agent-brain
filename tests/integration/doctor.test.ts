import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";
import { createDoctorCommand } from "../../src/commands/doctor.js";
import type { ScannableFsPort } from "../../src/core/fs-port.js";

describe("doctor command", () => {
  it("produces text and JSON reports for shared-root fixture scans", async () => {
    const fs = fixtureFs([
      {
        path: "~/.claude/skills",
        realPath: "/fixture/shared-skills",
        kind: "directory",
        adapters: ["claude-code"]
      },
      {
        path: "~/.codex/skills",
        realPath: "/fixture/shared-skills",
        kind: "directory",
        adapters: ["codex"]
      }
    ]);
    const cli = createCli({
      fs,
      commands: {
        doctor: createDoctorCommand()
      }
    });

    const text = await cli.run(["doctor"]);
    const json = await cli.run(["doctor", "--json"]);

    expect(text.stdout).toContain("shared-root");
    expect(JSON.parse(json.stdout).findings[0]).toMatchObject({
      id: "shared-root",
      severity: "high"
    });
  });

  it("reports unreadable paths without stopping the full scan", async () => {
    const fs = fixtureFs([
      {
        path: "~/.claude/skills/review/SKILL.md",
        kind: "file",
        adapter: "claude-code"
      },
      {
        path: "~/.codex/private",
        kind: "unreadable",
        error: "EACCES"
      }
    ]);
    const cli = createCli({
      fs,
      commands: {
        doctor: createDoctorCommand()
      }
    });

    const result = await cli.run(["doctor", "--json"]);
    const report = JSON.parse(result.stdout);

    expect(report.ok).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "unreadable-path", path: "~/.codex/private" })
      ])
    );
  });
});

function fixtureFs(entries: ScannableFsPort["entries"]): ScannableFsPort {
  return {
    root: "/fixture",
    entries
  };
}
