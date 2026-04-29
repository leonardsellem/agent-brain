import { explainConflict } from "../conflict/explain.js";
import type { CommandHandler } from "../types.js";

export function createExplainConflictCommand(): CommandHandler {
  return (_context, args) => {
    const conflictPath = args.find((arg) => !arg.startsWith("--"));
    if (!conflictPath) {
      return {
        ok: false,
        error: {
          code: "invalid_arguments",
          message: "explain-conflict requires a path"
        },
        findings: []
      };
    }

    const explanation = explainConflict({
      path: conflictPath,
      generated: args.includes("--generated")
    });

    return {
      ok: true,
      summary: explanation.message,
      findings: [
        {
          id: `conflict.${explanation.classification}`,
          severity: explanation.risk ? "high" : "medium",
          category: explanation.classification,
          path: explanation.path,
          message: explanation.message,
          recommendation: explanation.recommendation
        }
      ]
    };
  };
}
