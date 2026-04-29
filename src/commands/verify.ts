import { bootstrapTarget, verifyTarget } from "../apply/verifier.js";
import type { AgentBrainRepo } from "../core/model.js";
import { isScannableFsPort } from "../core/fs-port.js";
import type { TargetAdapterName } from "../core/provenance.js";
import { createAdoptionPlan } from "../import/adoption-plan.js";
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

      if (!isScannableFsPort(context.fs)) {
        return {
          ok: false,
          error: {
            code: "fixture_required",
            message: "verify requires --fixture in developer preview"
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
