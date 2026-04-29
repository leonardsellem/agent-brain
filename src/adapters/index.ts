import type { Finding } from "../types.js";
import type { AgentBrainPackage } from "../core/model.js";
import type { OwnershipClassification, TargetAdapterName } from "../core/provenance.js";

export const adapterVocabulary = [
  "portable-source",
  "generated-target",
  "native-owned",
  "runtime-cache",
  "machine-local",
  "secret",
  "foreign-owned",
  "unknown"
] as const satisfies readonly OwnershipClassification[];

export interface PathClassification {
  classification: OwnershipClassification;
  role: string;
  confidence: number;
}

export interface TargetVerificationInput {
  root: string;
  readable: boolean;
}

export interface AdapterCapabilities {
  version: 1;
  packageKinds: AgentBrainPackage["kind"][];
}

export interface MaterializePackageInput {
  pkg: AgentBrainPackage;
  content: string;
}

export type AdapterMaterialization =
  | {
      ok: true;
      path: string;
      content: string;
    }
  | {
      ok: false;
      finding: Finding;
    };

export interface TargetAdapter {
  name: TargetAdapterName;
  vocabulary: typeof adapterVocabulary;
  capabilities: AdapterCapabilities;
  classifyPath(path: string): PathClassification;
  materializePackage(input: MaterializePackageInput): AdapterMaterialization;
  verifyTarget(input: TargetVerificationInput): Finding[];
}

export interface ResolvedRoot {
  adapter: TargetAdapterName;
  path: string;
  realPath: string;
}

export function classifyByRules(
  candidatePath: string,
  rules: Array<[RegExp, PathClassification]>,
  fallbackRole = "unknown"
): PathClassification {
  const normalized = candidatePath.replace(/\\/g, "/");
  const match = rules.find(([pattern]) => pattern.test(normalized));
  return (
    match?.[1] ?? {
      classification: "unknown",
      role: fallbackRole,
      confidence: 0.2
    }
  );
}

export function detectSharedRootRisk(roots: ResolvedRoot[]): Finding[] {
  const findings: Finding[] = [];

  for (let leftIndex = 0; leftIndex < roots.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < roots.length; rightIndex += 1) {
      const left = roots[leftIndex]!;
      const right = roots[rightIndex]!;
      if (left.adapter === right.adapter || left.realPath !== right.realPath) {
        continue;
      }

      findings.push({
        id: "shared-root",
        severity: "high",
        category: "risk",
        path: left.realPath,
        message: `${left.adapter} and ${right.adapter} share ${left.realPath}`,
        recommendation: "Separate physical target roots while preserving logical packages"
      });
    }
  }

  return findings;
}
