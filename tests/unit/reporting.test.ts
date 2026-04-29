import { describe, expect, it } from "vitest";
import { renderJsonReport } from "../../src/reporting/json.js";
import { renderTextReport } from "../../src/reporting/text.js";
import type { Report } from "../../src/types.js";

describe("report rendering", () => {
  const report: Report = {
    ok: true,
    summary: "2 findings",
    findings: [
      {
        id: "shared-root",
        severity: "high" as const,
        category: "risk",
        path: "/fixture/.codex/skills",
        message: "Codex skills share a Claude-owned physical root",
        recommendation: "Separate physical targets while preserving logical packages"
      }
    ]
  };

  it("renders text and JSON from the same finding shape", () => {
    const text = renderTextReport(report);
    const json = JSON.parse(renderJsonReport(report));

    expect(text).toContain("shared-root");
    expect(text).toContain("Separate physical targets");
    expect(json.findings).toEqual(report.findings);
  });

  it("renders structured error envelopes as JSON", () => {
    const output = renderJsonReport({
      ok: false,
      error: {
        code: "invalid_arguments",
        message: "Missing value for --target-root"
      },
      findings: []
    });

    expect(JSON.parse(output)).toMatchObject({
      ok: false,
      error: {
        code: "invalid_arguments"
      }
    });
  });
});
