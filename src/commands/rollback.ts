import type { CommandHandler } from "../types.js";

export function createRollbackCommand(): CommandHandler {
  return () => ({
    ok: true,
    summary: "rollback requires snapshot metadata",
    findings: []
  });
}
