import { createAdoptionPlan } from "../import/adoption-plan.js";
import { writeBrainRepo } from "../import/brain-writer.js";
import { isScannableFsPort } from "../core/fs-port.js";
import type { CommandHandler, Finding } from "../types.js";

export function createPlanCommand(): CommandHandler {
  return (context) => {
    if (!isScannableFsPort(context.fs)) {
      return {
        ok: false,
        error: {
          code: "invalid_arguments",
          message: "plan requires a scannable filesystem fixture"
        },
        findings: []
      };
    }

    const plan = createAdoptionPlan(context.fs.entries);
    if (plan.conflicts.length > 0) {
      return {
        ok: false,
        error: {
          code: "import_conflicts",
          message: "Import has unresolved package conflicts"
        },
        findings: conflictFindings(plan.conflicts)
      };
    }

    return {
      ok: true,
      summary: summarizePlan(plan),
      findings: []
    };
  };
}

export function createImportCommand(): CommandHandler {
  return (context) => {
    if (!isScannableFsPort(context.fs)) {
      return {
        ok: false,
        error: {
          code: "invalid_arguments",
          message: "import requires a scannable filesystem fixture"
        },
        findings: []
      };
    }

    const plan = createAdoptionPlan(context.fs.entries);
    if (plan.conflicts.length > 0) {
      return {
        ok: false,
        error: {
          code: "import_conflicts",
          message: "Import has unresolved package conflicts"
        },
        findings: conflictFindings(plan.conflicts)
      };
    }

    const write = writeBrainRepo(plan);
    return {
      ok: true,
      summary: `${write.writtenPaths.length} files written`,
      findings: write.writtenPaths.map((path) => ({
        id: "brain-file-written",
        severity: "info",
        category: "portable-source",
        path,
        message: `Would write ${path}`
      }))
    };
  };
}

function summarizePlan(plan: ReturnType<typeof createAdoptionPlan>): string {
  return `${plan.packages.length} packages, ${plan.exclusions.length} exclusions, ${plan.conflicts.length} conflicts`;
}

function conflictFindings(conflicts: ReturnType<typeof createAdoptionPlan>["conflicts"]): Finding[] {
  return conflicts.map((conflict) => ({
    id: conflict.id,
    severity: "high",
    category: "conflict",
    path: conflict.paths.join(", "),
    message: `${conflict.packageId} has multiple source paths`,
    recommendation: "Rename or manually classify one source before import"
  }));
}
