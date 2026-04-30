import { bootstrapTarget, verifyTarget } from "../apply/verifier.js";
import { scanLiveRoot } from "../core/live-fs-port.js";
import type { AgentBrainRepo } from "../core/model.js";
import { isScannableFsPort } from "../core/fs-port.js";
import type { TargetAdapterName } from "../core/provenance.js";
import { readMaterializationLock, validateLockAdapter } from "../materialize/lock-store.js";
import { createAdoptionPlan } from "../import/adoption-plan.js";
import type { VirtualTarget } from "../apply/dry-run.js";
import type { CommandHandler, Finding } from "../types.js";

export function createVerifyCommand(findings: Finding[] = []): CommandHandler {
  return (context, args) => {
    if (findings.length === 0) {
      const targetRoot = optionValue(args, "--target-root");
      if (!targetRoot) {
        return {
          ok: false,
          error: {
            code: "verify_requires_target",
            message: "verify requires --target-root plus materialization lock evidence"
          },
          findings: []
        };
      }

      const repoRoot = optionValue(args, "--repo");
      if (repoRoot) {
        return verifyLiveTarget(repoRoot, targetRoot, args);
      }

      if (!isScannableFsPort(context.fs)) {
        return {
          ok: false,
          error: {
            code: "fixture_required",
            message: "verify requires --repo for live verification or --fixture for deterministic rehearsal"
          },
          findings: []
        };
      }

      const plan = createAdoptionPlan(context.fs.entries);
      const repo = repoFromPlan(plan);
      const adapter = firstAdapter(repo) ?? "claude-code";
      const bootstrapped = bootstrapTarget(repo, adapter, targetRoot);
      const verificationFindings = verifyTarget(bootstrapped.target, bootstrapped.lock);
      const failed = verificationFindings.some(
        (finding) => finding.severity === "high" || finding.severity === "critical"
      );
      const checkedFinding: Finding = {
        id: "verify.checked",
        severity: "info",
        category: "generated-target",
        path: targetRoot,
        message: `Checked ${bootstrapped.lock.entries.length} generated target entries`,
        provenance: {
          targetRoot,
          lockEntries: bootstrapped.lock.entries
        }
      };

      if (failed) {
        return {
          ok: false,
          error: {
            code: "verification_failed",
            message: "High severity verification findings remain"
          },
          findings: [checkedFinding, ...verificationFindings]
        };
      }

      return {
        ok: true,
        summary: `${verificationFindings.length} verification findings for ${targetRoot} using ${bootstrapped.lock.entries.length} lock entries`,
        findings: [checkedFinding, ...verificationFindings]
      };
    }

    const failed = findings.some((finding) => finding.severity === "high" || finding.severity === "critical");
    if (failed) {
      return {
        ok: false,
        error: {
          code: "verification_failed",
          message: "High severity verification findings remain"
        },
        findings
      };
    }

    return {
      ok: true,
      summary: `${findings.length} verification findings`,
      findings
    };
  };
}

function verifyLiveTarget(repoRoot: string, targetRoot: string, args: string[]): ReturnType<CommandHandler> {
  const adapter = optionValue(args, "--adapter");
  if (!isTargetAdapter(adapter)) {
    return {
      ok: false,
      error: {
        code: "adapter_required",
        message: "live verify requires --adapter <claude-code|codex>"
      },
      findings: []
    };
  }

  const lockResult = readMaterializationLock(repoRoot);
  if (!lockResult.ok) {
    return {
      ok: false,
      error: {
        code: "lock_invalid",
        message: "materialization lock could not be loaded"
      },
      findings: lockResult.errors.map((error) => ({
        id: "lock-invalid",
        severity: "high",
        category: "generated-target",
        path: lockResult.path,
        message: error
      }))
    };
  }

  const adapterValidation = validateLockAdapter(lockResult.lock, adapter);
  if (!adapterValidation.ok) {
    return {
      ok: false,
      error: {
        code: "lock_adapter_mismatch",
        message: "materialization lock adapter does not match requested verify adapter"
      },
      findings: adapterValidation.errors.map((error) => ({
        id: "lock-adapter-mismatch",
        severity: "high",
        category: "generated-target",
        path: lockResult.path,
        message: error
      }))
    };
  }

  const target = virtualTargetFromRoot(targetRoot, adapter);
  const verificationFindings = verifyTarget(target, lockResult.lock);
  const checkedFinding: Finding = {
    id: "verify.checked",
    severity: "info",
    category: "generated-target",
    path: targetRoot,
    message: `Checked ${lockResult.lock.entries.length} generated target entries`,
    provenance: {
      targetRoot,
      lockPath: lockResult.path,
      lockEntries: lockResult.lock.entries
    }
  };
  const failed = verificationFindings.length > 0;

  if (failed) {
    return {
      ok: false,
      error: {
        code: "verification_failed",
        message: "High severity verification findings remain"
      },
      findings: [checkedFinding, ...verificationFindings]
    };
  }

  return {
    ok: true,
    summary: `${verificationFindings.length} verification findings for ${targetRoot} using ${lockResult.lock.entries.length} lock entries`,
    findings: [checkedFinding, ...verificationFindings]
  };
}

function repoFromPlan(plan: ReturnType<typeof createAdoptionPlan>): AgentBrainRepo {
  return {
    schemaVersion: 1,
    packages: plan.packages,
    profiles: [plan.profile],
    exclusions: plan.exclusions
  };
}

function firstAdapter(repo: AgentBrainRepo): TargetAdapterName | undefined {
  return repo.packages[0]?.provenance.adapter;
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
