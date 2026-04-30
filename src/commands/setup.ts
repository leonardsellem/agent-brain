import type { CommandHandler } from "../types.js";

export function createSetupCommand(): CommandHandler {
  return () => ({
    ok: true,
    summary: "Setup is ready to discover sources and needs confirmation before writing.",
    findings: [
      {
        id: "setup.confirmation-required",
        severity: "info",
        category: "setup",
        message: "Guided setup is waiting at a confirmation boundary.",
        recommendation:
          "Review setup discovery before importing into an Agent Brain repo or mutating any live app root."
      }
    ]
  });
}
