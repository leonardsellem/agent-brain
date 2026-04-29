import { createAdoptionPlan } from "../import/adoption-plan.js";
import { writeBrainRepo } from "../import/brain-writer.js";
import { isScannableFsPort } from "../core/fs-port.js";
import { writeRepoFiles } from "../core/repo-writer.js";
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

    const findings = planFindings(plan);
    return {
      ok: true,
      summary: summarizePlan(plan),
      findings
    };
  };
}

export function createImportCommand(): CommandHandler {
  return (context, args) => {
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

    const repo = optionValue(args, "--repo");
    if (!repo) {
      return {
        ok: false,
        error: {
          code: "repo_required",
          message: "import requires --repo <destination>; run plan first to preview without writing"
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
    const repoWrite = writeRepoFiles(repo, Object.fromEntries(write.writtenPaths.map((path) => [path, write.files[path]!])));
    return {
      ok: true,
      summary: `${repoWrite.writtenPaths.length} files written`,
      findings: repoWrite.writtenPaths.map((path) => ({
        id: "brain-file-written",
        severity: "info",
        category: "portable-source",
        path,
        message: `Wrote ${path}`
      }))
    };
  };
}

function summarizePlan(plan: ReturnType<typeof createAdoptionPlan>): string {
  return `${plan.packages.length} packages, ${plan.exclusions.length} exclusions, ${plan.conflicts.length} conflicts, ${plan.rejections.length} rejections`;
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

function planFindings(plan: ReturnType<typeof createAdoptionPlan>): Finding[] {
  return [
    ...plan.rejections.map((rejection) => ({
      id: "import.rejected",
      severity: "high" as const,
      category: "secret",
      path: rejection.path,
      message: rejection.reason,
      recommendation: "Keep rejected material out of canonical package source unless explicitly overridden"
    })),
    ...plan.exclusions.map((exclusion) => ({
      id: "import.excluded",
      severity: exclusion.classification === "secret" ? ("high" as const) : ("medium" as const),
      category: exclusion.classification,
      path: exclusion.path,
      message: `Excluded ${exclusion.classification}: ${exclusion.reason}`,
      recommendation: "Leave excluded material in the native app surface or classify it manually"
    }))
  ];
}

function optionValue(args: string[], option: string): string | undefined {
  const optionIndex = args.indexOf(option);
  return optionIndex === -1 ? undefined : args[optionIndex + 1];
}
