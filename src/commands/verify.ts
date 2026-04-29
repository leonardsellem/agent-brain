import type { CommandHandler, Finding } from "../types.js";

export function createVerifyCommand(findings: Finding[] = []): CommandHandler {
  return () => {
    const failed = findings.some((finding) => finding.severity === "high" || finding.severity === "critical");
    if (failed) {
      return {
        ok: false,
        error: {
          code: "verification_failed",
          message: "High severity verification findings remain"
        },
        findings
      };
    }

    return {
      ok: true,
      summary: `${findings.length} verification findings`,
      findings
    };
  };
}
