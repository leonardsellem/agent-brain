import path from "node:path";
import { createDryRun } from "../apply/dry-run.js";
import { applyLiveDryRun } from "../apply/live-materializer.js";
import { applyWithSnapshot } from "../apply/materializer.js";
import { createSnapshot } from "../apply/snapshot.js";
import { writeSnapshot } from "../apply/snapshot-store.js";
import type { ApplyOperation, VirtualTarget } from "../apply/dry-run.js";
import { isScannableFsPort } from "../core/fs-port.js";
import { readAgentBrainRepo } from "../core/repo-reader.js";
import { scanLiveRoot } from "../core/live-fs-port.js";
import { createAdoptionPlan } from "../import/adoption-plan.js";
import { planTargetMaterialization } from "../materialize/target-planner.js";
import { writeMaterializationLock } from "../materialize/lock-store.js";
import type { TargetAdapterName } from "../core/provenance.js";
import type { CommandHandler } from "../types.js";

export function createApplyCommand(): CommandHandler {
  return (context, args) => {
    const targetRoot = optionValue(args, "--target-root");
    if (!targetRoot) {
      return {
        ok: false,
        error: {
          code: "apply_requires_target",
          message:
            "apply requires --target-root; use --repo for live materialization or --fixture for deterministic rehearsal. For guided same-machine setup, run agent-brain setup."
        },
        findings: []
      };
    }

    const repoRoot = optionValue(args, "--repo");
    if (repoRoot) {
      return createLiveDryRun(repoRoot, targetRoot, args);
    }

    if (!isScannableFsPort(context.fs)) {
      return {
        ok: false,
        error: {
          code: "apply_source_required",
          message: "apply requires --repo for live materialization or --fixture for deterministic rehearsal"
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

function createLiveDryRun(repoRoot: string, targetRoot: string, args: string[]): ReturnType<CommandHandler> {
  const adapter = optionValue(args, "--adapter");
  if (!isTargetAdapter(adapter)) {
    return {
      ok: false,
      error: {
        code: "adapter_required",
        message: "live apply dry-run requires --adapter <claude-code|codex>"
      },
      findings: []
    };
  }

  const profileId = optionValue(args, "--profile") ?? "profile.default";
  const loaded = readAgentBrainRepo(repoRoot);
  if (!loaded.ok || !loaded.repo) {
    return {
      ok: false,
      error: {
        code: "repo_invalid",
        message: "Agent Brain repo could not be loaded"
      },
      findings: loaded.errors.map((error) => ({
        id: "repo-invalid",
        severity: "high",
        category: "unknown",
        path: repoRoot,
        message: error
      }))
    };
  }

  const target = virtualTargetFromRoot(targetRoot, adapter);
  const planned = planTargetMaterialization({
    repo: loaded.repo,
    packageFiles: loaded.packageFiles,
    adapter,
    profileId,
    targetRoot,
    target
  });
  const dryRun = createDryRun(target, planned.operations);
  const confirmationFingerprint = optionValue(args, "--confirm-fingerprint");

  if (confirmationFingerprint) {
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
            message: "Live apply was refused before mutation",
            recommendation: "Re-run dry-run and confirm the exact reported fingerprint",
            provenance: {
              expected: dryRun.fingerprint,
              received: confirmationFingerprint
            }
          }
        ]
      };
    }

    const snapshot = createSnapshot(target, dryRun, `${adapter}@1`);
    const snapshotWrite = writeSnapshot(repoRoot, snapshot);
    const liveApply = applyLiveDryRun(targetRoot, dryRun, confirmationFingerprint);
    const lockWrite = writeMaterializationLock(repoRoot, planned.lock);

    return {
      ok: true,
      summary: `snapshot ${snapshot.id} created for ${dryRun.operations.length} operations`,
      findings: [
        {
          id: "apply.snapshot-created",
          severity: "info",
          category: "generated-target",
          path: targetRoot,
          message: "Live apply completed against the explicit target root",
          recommendation: "Run verify with the materialization lock before considering the target healthy",
          provenance: {
            fingerprint: dryRun.fingerprint,
            snapshotId: snapshot.id,
            snapshotPath: snapshotWrite.path,
            lockPath: lockWrite.path,
            changedPaths: liveApply.changedPaths,
            snapshotEntries: snapshot.entries
          }
        }
      ]
    };
  }

  return {
    ok: true,
    summary: `dry-run ${dryRun.operations.length} operations; fingerprint ${dryRun.fingerprint}`,
    findings: [
      ...planned.findings,
      {
        id: "apply.dry-run",
        severity: dryRun.operations.length === 0 ? "low" : "info",
        category: "generated-target",
        path: targetRoot,
        message:
          dryRun.operations.length === 0
            ? "Dry-run produced no operations and did not mutate the target"
            : "Dry-run evidence produced without mutating the target",
        recommendation: "Review operations and fingerprint before confirming live apply",
        provenance: {
          adapter,
          profileId,
          fingerprint: dryRun.fingerprint,
          operations: dryRun.operations,
          lock: planned.lock
        }
      }
    ]
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

function isTargetAdapter(value: string | undefined): value is TargetAdapterName {
  return value === "claude-code" || value === "codex";
}

function virtualTargetFromRoot(targetRoot: string, adapter: TargetAdapterName): VirtualTarget {
  const scanned = scanLiveRoot({
    root: targetRoot,
    adapter,
    contentSampleBytes: Number.MAX_SAFE_INTEGER
  });

  return {
    files: Object.fromEntries(
      scanned.entries
        .filter((entry) => entry.kind === "file")
        .map((entry) => [entry.path, entry.contentSample ?? ""])
    ),
    symlinks: Object.fromEntries(
      scanned.entries
        .filter((entry) => entry.kind === "symlink" && entry.linkTarget)
        .map((entry) => [entry.path, entry.linkTarget!])
    )
  };
}
