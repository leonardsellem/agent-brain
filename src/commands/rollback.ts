import type { CommandHandler } from "../types.js";

export function createRollbackCommand(): CommandHandler {
  return (_context, args) => {
    const snapshot = optionValue(args, "--snapshot");
    if (!snapshot) {
      return {
        ok: false,
        error: {
          code: "snapshot_required",
          message: "rollback requires --snapshot metadata"
        },
        findings: []
      };
    }

    return {
      ok: true,
      summary: `rollback snapshot metadata accepted from ${snapshot}`,
      findings: [
        {
          id: "rollback.snapshot-required",
          severity: "info",
          category: "generated-target",
          path: snapshot,
          message: "Snapshot metadata was provided; virtual rollback primitives remain path-scoped"
        }
      ]
    };
  };
}

function optionValue(args: string[], option: string): string | undefined {
  const optionIndex = args.indexOf(option);
  return optionIndex === -1 ? undefined : args[optionIndex + 1];
}
