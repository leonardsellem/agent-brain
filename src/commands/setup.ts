import { isScannableFsPort } from "../core/fs-port.js";
import { createSetupClassificationSummary } from "../setup/classification-summary.js";
import { createSetupDiscovery } from "../setup/discovery.js";
import type { CommandHandler, Finding } from "../types.js";

const setupReportSampleLimit = 50;

export function createSetupCommand(): CommandHandler {
  return (context) => {
    const discovery = isScannableFsPort(context.fs) ? createSetupDiscovery(context.fs) : undefined;
    const classificationSummary = isScannableFsPort(context.fs)
      ? createSetupClassificationSummary(context.fs.entries)
      : undefined;
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

    return {
      ok: true,
      summary: discovery
        ? `Setup found ${discovery.visibleRoots.length} visible roots, ${discovery.sources.length} sources, and ${discovery.symlinks.length} symlinks. Confirmation required before writing.`
        : "Setup is ready to discover sources and needs confirmation before writing.",
      findings
    };
  };
}

function sample<T>(values: T[]): T[] {
  return values.slice(0, setupReportSampleLimit);
}
