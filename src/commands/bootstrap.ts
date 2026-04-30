import { createApplyCommand } from "./apply.js";
import type { CommandHandler } from "../types.js";

export function createBootstrapCommand(): CommandHandler {
  const apply = createApplyCommand();
  return async (context, args) => {
    const report = await apply(context, args);
    if (!report.ok) {
      return {
        ...report,
        error: {
          code: report.error.code.replace(/^apply/, "bootstrap"),
          message: report.error.message
            .replace(/^apply/, "bootstrap")
            .replace(/live materialization/g, "bootstrap materialization")
        },
        findings: report.findings.map((finding) => ({
          ...finding,
          id: finding.id.replace(/^apply\./, "bootstrap."),
          message: finding.message.replace(/^Apply/, "Bootstrap").replace(/^Live apply/, "Bootstrap")
        }))
      };
    }

    return {
      ...report,
      summary: report.summary?.replace(/^dry-run/, "bootstrap dry-run").replace(/^snapshot/, "bootstrap snapshot"),
      findings: report.findings.map((finding) => {
        if (finding.id === "apply.dry-run") {
          return {
            ...finding,
            id: "bootstrap.dry-run",
            message: "Bootstrap dry-run prepared a second-machine target without mutating it",
            recommendation: "Review operations and fingerprint before confirming bootstrap"
          };
        }

        if (finding.id === "apply.snapshot-created") {
          return {
            ...finding,
            id: "bootstrap.snapshot-created",
            message: "Bootstrap completed against the explicit second-machine target",
            recommendation: "Run verify with the materialization lock before considering the target healthy"
          };
        }

        return finding;
      })
    };
  };
}
