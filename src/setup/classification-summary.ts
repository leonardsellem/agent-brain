import { classifyEntry } from "../core/classification.js";
import type { ScannableEntry } from "../core/fs-port.js";
import type { OwnershipClassification } from "../core/provenance.js";
import type { Finding } from "../types.js";

export interface SetupClassificationSummary {
  counts: {
    portableCandidates: number;
    adapterProfileCandidates: number;
    defaultExclusions: number;
    unknownReviewItems: number;
    classificationFindings: number;
  };
  portableCandidates: SetupClassifiedItem[];
  adapterProfileCandidates: SetupClassifiedItem[];
  defaultExclusions: SetupClassifiedItem[];
  unknownReviewItems: SetupClassifiedItem[];
  classificationFindings: Finding[];
}

export interface SetupClassifiedItem {
  path: string;
  classification: OwnershipClassification;
  role: string;
  confidence: number;
  recommendation?: string;
}

const defaultExcludedClassifications = new Set<OwnershipClassification>([
  "secret",
  "runtime-cache",
  "machine-local",
  "foreign-owned"
]);

const adapterProfileClassifications = new Set<OwnershipClassification>([
  "native-owned",
  "generated-target"
]);

export function createSetupClassificationSummary(entries: ScannableEntry[]): SetupClassificationSummary {
  const portableCandidates: SetupClassifiedItem[] = [];
  const adapterProfileCandidates: SetupClassifiedItem[] = [];
  const defaultExclusions: SetupClassifiedItem[] = [];
  const unknownReviewItems: SetupClassifiedItem[] = [];
  const classificationFindings: Finding[] = [];

  for (const entry of entries) {
    const classified = classifyEntry(entry);
    const item: SetupClassifiedItem = {
      path: entry.logicalPath ?? classified.path,
      classification: classified.classification,
      role: classified.role,
      confidence: classified.confidence,
      recommendation: classified.recommendation
    };

    classificationFindings.push(...classified.findings);

    if (classified.classification === "portable-source") {
      portableCandidates.push(item);
      continue;
    }

    if (defaultExcludedClassifications.has(classified.classification)) {
      defaultExclusions.push(item);
      continue;
    }

    if (adapterProfileClassifications.has(classified.classification)) {
      adapterProfileCandidates.push(item);
      continue;
    }

    unknownReviewItems.push(item);
  }

  return {
    counts: {
      portableCandidates: portableCandidates.length,
      adapterProfileCandidates: adapterProfileCandidates.length,
      defaultExclusions: defaultExclusions.length,
      unknownReviewItems: unknownReviewItems.length,
      classificationFindings: classificationFindings.length
    },
    portableCandidates,
    adapterProfileCandidates,
    defaultExclusions,
    unknownReviewItems,
    classificationFindings: dedupeFindings(classificationFindings)
  };
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.id}:${finding.path ?? ""}:${finding.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
