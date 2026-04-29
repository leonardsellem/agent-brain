import { createDryRun } from "../apply/dry-run.js";
import { applyWithSnapshot } from "../apply/materializer.js";
import type { CommandHandler } from "../types.js";

export function createApplyCommand(): CommandHandler {
  return () => {
    const target = { files: {}, symlinks: {} };
    const dryRun = createDryRun(target, []);
    const result = applyWithSnapshot(target, dryRun, dryRun.fingerprint, "agent-brain@0.1");
    return {
      ok: true,
      summary: `snapshot ${result.snapshot.id} created`,
      findings: []
    };
  };
}
