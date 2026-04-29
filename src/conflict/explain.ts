import type { OwnershipClassification } from "../core/provenance.js";

export interface ConflictInput {
  path: string;
  generated?: boolean;
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
  if (input.sharedRoot) {
    return {
      path: input.path,
      classification: "unknown",
      risk: "shared-root",
      message: `${input.sharedRoot.adapters.join(" and ")} share ${input.sharedRoot.realPath}`,
      recommendation: "Separate physical target roots before resolving generated output conflicts"
    };
  }

  if (input.generated) {
    return {
      path: input.path,
      classification: "generated-target",
      message: "Conflict is in generated target output",
      recommendation: "Regenerate from canonical package/profile intent rather than hand-merging"
    };
  }

  if (input.path.startsWith("packages/") || input.path.startsWith("profiles/")) {
    return {
      path: input.path,
      classification: "portable-source",
      message: "Conflict is in canonical Agent Brain source",
      recommendation: "Resolve in Agent Brain package source, then regenerate targets"
    };
  }

  if (/(cache|history|auth|token|secret)/i.test(input.path)) {
    return {
      path: input.path,
      classification: input.path.match(/auth|token|secret/i) ? "secret" : "runtime-cache",
      message: "Conflict is in non-portable target state",
      recommendation: "Keep it out of canonical source unless explicitly reclassified"
    };
  }

  return {
    path: input.path,
    classification: "unknown",
    message: "Conflict path is not classified",
    recommendation: "Inspect and classify before import, apply, or merge"
  };
}
