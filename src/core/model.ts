import path from "node:path";
import type {
  OwnershipClassification,
  Provenance,
  TargetAdapterName
} from "./provenance.js";
import { validateProvenance } from "./provenance.js";

export interface AgentBrainPackage {
  id: string;
  kind: "skill" | "plugin" | "prompt" | "mcp" | "app" | "config";
  name: string;
  files: string[];
  provenance: Provenance;
}

export interface ProfileTargetIntent {
  packageIds: string[];
}

export interface AgentBrainProfile {
  id: string;
  name: string;
  packages: string[];
  targets: Partial<Record<TargetAdapterName, ProfileTargetIntent>>;
}

export interface AgentBrainExclusion {
  path: string;
  classification: Exclude<OwnershipClassification, "portable-source">;
  reason: string;
}

export interface AgentBrainRepo {
  schemaVersion: 1;
  packages: AgentBrainPackage[];
  profiles: AgentBrainProfile[];
  exclusions: AgentBrainExclusion[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface AdapterOutput {
  packageId: string;
  path: string;
  contentHash: string;
}

export interface LockInput {
  adapter: TargetAdapterName;
  targetRoot: string;
  outputs: AdapterOutput[];
}

export interface MaterializationLockEntry {
  adapter: TargetAdapterName;
  packageId: string;
  targetPath: string;
  contentHash: string;
  generated: true;
}

export interface MaterializationLock {
  schemaVersion: 1;
  entries: MaterializationLockEntry[];
}

export function validateAgentBrainRepo(repo: AgentBrainRepo): ValidationResult {
  const errors: string[] = [];
  const packageIds = new Set<string>();

  if (repo.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }

  repo.packages.forEach((pkg, index) => {
    if (!pkg.id) {
      errors.push(`packages[${index}].id is required`);
    }
    packageIds.add(pkg.id);

    const provenanceErrors = validateProvenance(pkg.provenance).map(
      (error) => `packages[${index}].provenance.${error}`
    );
    errors.push(...provenanceErrors);

    if (
      pkg.provenance.classification === "unknown" &&
      pkg.provenance.userOverride !== true
    ) {
      errors.push(
        `packages[${index}].provenance.classification requires userOverride for unknown portable source`
      );
    }

    if (
      pkg.provenance.classification &&
      pkg.provenance.classification !== "portable-source" &&
      pkg.provenance.userOverride !== true
    ) {
      errors.push(
        `packages[${index}].provenance.classification must be portable-source or user-overridden`
      );
    }
  });

  repo.profiles.forEach((profile, profileIndex) => {
    for (const packageId of profile.packages) {
      if (!packageIds.has(packageId)) {
        errors.push(`profiles[${profileIndex}].packages references missing package ${packageId}`);
      }
    }

    for (const [adapter, intent] of Object.entries(profile.targets)) {
      for (const packageId of intent.packageIds) {
        if (!packageIds.has(packageId)) {
          errors.push(
            `profiles[${profileIndex}].targets.${adapter} references missing package ${packageId}`
          );
        }
      }
    }
  });

  return {
    ok: errors.length === 0,
    errors
  };
}

export function deriveMaterializationLock(
  _repo: AgentBrainRepo,
  input: LockInput
): MaterializationLock {
  return {
    schemaVersion: 1,
    entries: input.outputs.map((output) => ({
      adapter: input.adapter,
      packageId: output.packageId,
      targetPath: path.posix.join(input.targetRoot, output.path),
      contentHash: output.contentHash,
      generated: true
    }))
  };
}
