export type SourceKind = "dotstate" | "chezmoi" | "stow" | "bare-git" | "home" | "unmanaged";

export type OwnershipClassification =
  | "portable-source"
  | "generated-target"
  | "native-owned"
  | "runtime-cache"
  | "machine-local"
  | "secret"
  | "foreign-owned"
  | "unknown";

export type TargetAdapterName = "claude-code" | "codex";

export interface Provenance {
  sourceKind: SourceKind;
  sourcePath: string;
  originalTarget?: string;
  adapter: TargetAdapterName;
  classification: OwnershipClassification;
  confidence: number;
  userOverride?: boolean;
}

export function validateProvenance(value: Partial<Provenance>): string[] {
  const errors: string[] = [];

  for (const key of ["sourcePath", "adapter", "classification", "confidence"] as const) {
    if (value[key] === undefined || value[key] === "") {
      errors.push(`${key} is required`);
    }
  }

  if (value.confidence !== undefined && (value.confidence < 0 || value.confidence > 1)) {
    errors.push("confidence must be between 0 and 1");
  }

  return errors;
}

export function describeProvenance(provenance: Provenance): string {
  return `${provenance.sourceKind} -> ${provenance.adapter} ${provenance.classification} (${Math.round(
    provenance.confidence * 100
  )}% confidence)`;
}
