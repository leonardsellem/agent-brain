import type { OwnershipClassification } from "../core/provenance.js";
import type { MaterializationLock } from "../core/model.js";
import { toDisplayPath } from "../core/display-path.js";

export interface ConflictInput {
  path: string;
  generated?: boolean;
  lock?: MaterializationLock;
  sharedRoot?: {
    adapters: string[];
    realPath: string;
  };
}

export interface ConflictExplanation {
  path: string;
  classification: OwnershipClassification;
  risk?: "shared-root";
  recommendation: string;
  message: string;
}

export function explainConflict(input: ConflictInput): ConflictExplanation {
  const displayPath = toDisplayPath(input.path);
  if (input.sharedRoot) {
    const displayRealPath = toDisplayPath(input.sharedRoot.realPath);
    return {
      path: displayPath,
      classification: "unknown",
      risk: "shared-root",
      message: `${input.sharedRoot.adapters.join(" and ")} share ${displayRealPath}`,
      recommendation: "Separate physical target roots before resolving generated output conflicts"
    };
  }

  if (input.generated || input.lock?.entries.some((entry) => entry.targetPath === input.path)) {
    return {
      path: displayPath,
      classification: "generated-target",
      message: "Conflict is in generated target output",
      recommendation: "Regenerate from canonical package/profile intent rather than hand-merging"
    };
  }

  if (displayPath.startsWith("packages/") || displayPath.startsWith("profiles/")) {
    return {
      path: displayPath,
      classification: "portable-source",
      message: "Conflict is in canonical Agent Brain source",
      recommendation: "Resolve in Agent Brain package source, then regenerate targets"
    };
  }

  if (/(cache|history|auth|token|secret)/i.test(displayPath)) {
    return {
      path: displayPath,
      classification: displayPath.match(/auth|token|secret/i) ? "secret" : "runtime-cache",
      message: "Conflict is in non-portable target state",
      recommendation: "Keep it out of canonical source unless explicitly reclassified"
    };
  }

  return {
    path: displayPath,
    classification: "unknown",
    message: "Conflict path is not classified",
    recommendation: "Inspect and classify before import, apply, or merge"
  };
}
