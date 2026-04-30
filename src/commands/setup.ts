import os from "node:os";
import path from "node:path";
import { createApplyCommand } from "./apply.js";
import { createVerifyCommand } from "./verify.js";
import { toDisplayPath } from "../core/display-path.js";
import { isScannableFsPort } from "../core/fs-port.js";
import { createTargetBackup } from "../setup/backups.js";
import { createSetupClassificationSummary } from "../setup/classification-summary.js";
import { createSetupDiscovery } from "../setup/discovery.js";
import { createSetupImportPlan, writeSetupImport } from "../setup/flow.js";
import type { CommandHandler, Finding } from "../types.js";

const setupReportSampleLimit = 50;

export function createSetupCommand(): CommandHandler {
  return (context, args) => {
    const discovery = isScannableFsPort(context.fs) ? createSetupDiscovery(context.fs) : undefined;
    const classificationSummary = isScannableFsPort(context.fs)
      ? createSetupClassificationSummary(context.fs.entries)
      : undefined;
    const explicitRepoDestination = optionValue(args, "--repo");
    const repoDestination = explicitRepoDestination ?? path.join(os.homedir(), ".agent-brain");
    const previewRepoDestination = explicitRepoDestination ?? toDisplayPath(repoDestination);
    const importConfirmed = args.includes("--confirm-import");
    const targetRoot = optionValue(args, "--target-root");
    const adapter = optionValue(args, "--adapter");
    const profile = optionValue(args, "--profile") ?? "profile.default";
    const confirmationFingerprint = optionValue(args, "--confirm-fingerprint");
    const findings: Finding[] = [
      {
        id: "setup.confirmation-required",
        severity: "info",
        category: "setup",
        message: "Guided setup is waiting at a confirmation boundary.",
        recommendation:
          "Review setup discovery before importing into an Agent Brain repo or mutating any live app root."
      }
    ];

    if (discovery) {
      findings.push({
        id: "setup.discovery",
        severity: "info",
        category: "setup",
        message: "Read-only setup discovery completed.",
        provenance: {
          visibleRoots: discovery.visibleRoots,
          sources: discovery.sources,
          symlinkCount: discovery.symlinks.length,
          symlinks: sample(discovery.symlinks),
          adapterTargets: discovery.adapterTargets
        }
      });
    }

    if (classificationSummary) {
      findings.push({
        id: "setup.classification-summary",
        severity: "info",
        category: "setup",
        message: `Setup grouped ${classificationSummary.counts.portableCandidates} portable candidates, ${classificationSummary.counts.defaultExclusions} default exclusions, and ${classificationSummary.counts.unknownReviewItems} unknown review items.`,
        provenance: {
          counts: classificationSummary.counts,
          portableCandidates: sample(classificationSummary.portableCandidates),
          adapterProfileCandidates: sample(classificationSummary.adapterProfileCandidates),
          defaultExclusions: sample(classificationSummary.defaultExclusions),
          unknownReviewItems: sample(classificationSummary.unknownReviewItems),
          classificationFindings: sample(classificationSummary.classificationFindings)
        }
      });
    }

    if (isScannableFsPort(context.fs)) {
      const importPlan = createSetupImportPlan(context.fs.entries);
      if (importConfirmed && importPlan.conflicts.length > 0) {
        return {
          ok: false,
          error: {
            code: "import_conflicts",
            message: "Setup import has unresolved package conflicts"
          },
          findings: importPlan.conflicts.map((conflict) => ({
            id: conflict.id,
            severity: "high",
            category: "conflict",
            path: conflict.paths.join(", "),
            message: `${conflict.packageId} has multiple source paths`,
            recommendation: "Rename or manually classify one source before confirming setup import"
          }))
        };
      }

      if (importConfirmed) {
        const imported = writeSetupImport(importPlan, repoDestination);
        findings.push(...imported.writtenPaths.map((writtenPath) => ({
          id: "setup.import-written",
          severity: "info" as const,
          category: "portable-source",
          path: writtenPath,
          message: `Wrote ${writtenPath}`
        })));

        if (targetRoot && adapter) {
          const backup = createTargetBackup({
            repoDestination,
            targetRoot
          });
          findings.push({
            id: "setup.backup-created",
            severity: "info",
            category: "generated-target",
            path: targetRoot,
            message: "Backed up selected target root before live rewrite confirmation.",
            provenance: {
              backupPath: backup.backupPath
            }
          });

          const applyArgs = [
            "--repo",
            repoDestination,
            "--target-root",
            targetRoot,
            "--adapter",
            adapter,
            "--profile",
            profile
          ];
          if (confirmationFingerprint) {
            applyArgs.push("--confirm-fingerprint", confirmationFingerprint);
          }

          const applyReport = awaitMaybe(createApplyCommand()(context, applyArgs));
          if (!applyReport.ok) {
            return {
              ...applyReport,
              findings: [...findings, ...applyReport.findings]
            };
          }
          findings.push(...applyReport.findings);

          if (confirmationFingerprint) {
            const snapshotFinding = applyReport.findings.find((finding) => finding.id === "apply.snapshot-created");
            const verifyReport = awaitMaybe(
              createVerifyCommand()(context, [
                "--repo",
                repoDestination,
                "--target-root",
                targetRoot,
                "--adapter",
                adapter
              ])
            );
            findings.push(...verifyReport.findings);
            if (snapshotFinding) {
              findings.push(createRecoveryGuidanceFinding({
                backupPath: backup.backupPath,
                snapshotFinding,
                targetRoot,
                verifyOk: verifyReport.ok
              }));
            }
            if (!verifyReport.ok) {
              return {
                ...verifyReport,
                findings
              };
            }
          }
        }
      } else {
        findings.push({
          id: "setup.import-confirmation-required",
          severity: "info",
          category: "setup",
          path: previewRepoDestination,
          message: "Setup has not written the canonical Agent Brain repo.",
          recommendation: "Re-run setup with --confirm-import after reviewing the discovery summary"
        });
      }
    }

    return {
      ok: true,
      summary: discovery
        ? `Setup found ${discovery.visibleRoots.length} visible roots, ${discovery.sources.length} sources, and ${discovery.symlinks.length} symlinks. ${importConfirmed ? "Import complete." : "Confirmation required before writing."}`
        : "Setup is ready to discover sources and needs confirmation before writing.",
      findings
    };
  };
}

function awaitMaybe<T>(value: T | Promise<T>): T {
  if (value instanceof Promise) {
    throw new Error("setup command expected synchronous command helpers");
  }
  return value;
}

function sample<T>(values: T[]): T[] {
  return values.slice(0, setupReportSampleLimit);
}

function createRecoveryGuidanceFinding(input: {
  backupPath: string;
  snapshotFinding: Finding;
  targetRoot: string;
  verifyOk: boolean;
}): Finding {
  const snapshotPath = String(input.snapshotFinding.provenance?.snapshotPath ?? "");
  const lockPath = String(input.snapshotFinding.provenance?.lockPath ?? "");
  const changedPaths = input.snapshotFinding.provenance?.changedPaths;
  const rollbackCommand = snapshotPath
    ? `agent-brain rollback --snapshot ${quoteShell(snapshotPath)} --target-root ${quoteShell(input.targetRoot)}`
    : undefined;

  return {
    id: "setup.recovery-guidance",
    severity: input.verifyOk ? "info" : "high",
    category: "generated-target",
    path: input.targetRoot,
    message: input.verifyOk
      ? "Live rewrite verification completed; recovery evidence is available."
      : "Live rewrite verification failed; use recovery evidence before continuing.",
    recommendation: rollbackCommand
      ? `Keep the backup and snapshot paths. To restore the baseline, run: ${rollbackCommand}`
      : "Keep the backup evidence and inspect the apply snapshot before continuing.",
    provenance: {
      backupPath: input.backupPath,
      snapshotPath,
      lockPath,
      changedPaths: Array.isArray(changedPaths) ? changedPaths : [],
      verifyOk: input.verifyOk,
      rollbackCommand
    }
  };
}

function quoteShell(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function optionValue(args: string[], option: string): string | undefined {
  const optionIndex = args.indexOf(option);
  return optionIndex === -1 ? undefined : args[optionIndex + 1];
}
