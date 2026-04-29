import path from "node:path";
import { createDryRun } from "../apply/dry-run.js";
import { applyWithSnapshot } from "../apply/materializer.js";
import type { ApplyOperation } from "../apply/dry-run.js";
import { isScannableFsPort } from "../core/fs-port.js";
import { createAdoptionPlan } from "../import/adoption-plan.js";
import type { CommandHandler } from "../types.js";

export function createApplyCommand(): CommandHandler {
  return (context, args) => {
    const targetRoot = optionValue(args, "--target-root");
    if (!targetRoot) {
      return {
        ok: false,
        error: {
          code: "apply_requires_target",
          message: "apply requires --target-root plus fixture-backed dry-run evidence"
        },
        findings: []
      };
    }

    if (!isScannableFsPort(context.fs)) {
      return {
        ok: false,
        error: {
          code: "fixture_required",
          message: "apply requires --fixture in developer preview"
        },
        findings: []
      };
    }

    const adoptionPlan = createAdoptionPlan(context.fs.entries);
    if (adoptionPlan.conflicts.length > 0) {
      return {
        ok: false,
        error: {
          code: "apply_conflicts",
          message: "apply requires an adoption plan without package conflicts"
        },
        findings: adoptionPlan.conflicts.map((conflict) => ({
          id: conflict.id,
          severity: "high",
          category: "conflict",
          path: conflict.paths.join(", "),
          message: `${conflict.packageId} has multiple source paths`,
          recommendation: "Resolve import conflicts before apply"
        }))
      };
    }

    const target = { files: {}, symlinks: {} };
    const operations = operationsForTarget(adoptionPlan, targetRoot);
    const dryRun = createDryRun(target, operations);
    const confirmationFingerprint = optionValue(args, "--confirm-fingerprint");
    if (!confirmationFingerprint) {
      return {
        ok: true,
        summary: `dry-run ${dryRun.operations.length} operations; fingerprint ${dryRun.fingerprint}`,
        findings: [
          {
            id: "apply.dry-run",
            severity: dryRun.operations.length === 0 ? "low" : "info",
            category: "generated-target",
            path: targetRoot,
            message:
              dryRun.operations.length === 0
                ? "Dry-run produced no operations and did not mutate the target"
                : "Dry-run evidence produced; re-run with --confirm-fingerprint to apply",
            recommendation: "Review operations and fingerprint before confirming apply",
            provenance: {
              fingerprint: dryRun.fingerprint,
              operations: dryRun.operations
            }
          }
        ]
      };
    }

    if (confirmationFingerprint !== dryRun.fingerprint) {
      return {
        ok: false,
        error: {
          code: "fingerprint_mismatch",
          message: "confirmation fingerprint does not match dry-run fingerprint"
        },
        findings: [
          {
            id: "apply.fingerprint-mismatch",
            severity: "high",
            category: "generated-target",
            path: targetRoot,
            message: "Apply was refused before mutation",
            recommendation: "Re-run dry-run and confirm the exact reported fingerprint",
            provenance: {
              expected: dryRun.fingerprint,
              received: confirmationFingerprint
            }
          }
        ]
      };
    }

    const result = applyWithSnapshot(target, dryRun, confirmationFingerprint, "agent-brain@0.1");
    return {
      ok: true,
      summary: `snapshot ${result.snapshot.id} created for ${dryRun.operations.length} operations`,
      findings: [
        {
          id: "apply.snapshot-created",
          severity: "info",
          category: "generated-target",
          path: targetRoot,
          message: "Apply completed against the fixture-backed virtual target",
          recommendation: "Run verify with the materialization lock before considering the target healthy",
          provenance: {
            fingerprint: dryRun.fingerprint,
            snapshotId: result.snapshot.id,
            changedPaths: changedPaths(dryRun.operations),
            snapshotEntries: result.snapshot.entries
          }
        }
      ]
    };
  };
}

function operationsForTarget(
  adoptionPlan: ReturnType<typeof createAdoptionPlan>,
  targetRoot: string
): ApplyOperation[] {
  return adoptionPlan.packages.map((pkg) => {
    const packageSlug = pkg.files[0]?.split("/")[1] ?? pkg.id.replace(/^pkg\./, "");
    return {
      type: "create" as const,
      path: path.posix.join(targetRoot, "skills", packageSlug, "SKILL.md"),
      content: `# ${pkg.name}\n`
    };
  });
}

function changedPaths(operations: ApplyOperation[]): string[] {
  return operations.flatMap((operation) => (operation.type === "move" ? [operation.path, operation.to] : [operation.path]));
}

function optionValue(args: string[], option: string): string | undefined {
  const optionIndex = args.indexOf(option);
  return optionIndex === -1 ? undefined : args[optionIndex + 1];
}
