import { classifyEntry } from "../core/classification.js";
import type { AgentBrainExclusion, AgentBrainPackage, AgentBrainProfile } from "../core/model.js";
import type { ScannableEntry } from "../core/fs-port.js";
import type { TargetAdapterName } from "../core/provenance.js";
import { readPortableSourceContent } from "./source-reader.js";

export interface AdoptionConflict {
  id: "package-name-conflict";
  packageId: string;
  paths: string[];
}

export interface AdoptionRejection {
  path: string;
  reason: string;
}

export interface AdoptionPlan {
  packages: AgentBrainPackage[];
  profile: AgentBrainProfile;
  exclusions: AgentBrainExclusion[];
  conflicts: AdoptionConflict[];
  rejections: AdoptionRejection[];
  packageSources: Record<string, string>;
}

export function createAdoptionPlan(entries: ScannableEntry[]): AdoptionPlan {
  const packages = new Map<string, AgentBrainPackage>();
  const packagePaths = new Map<string, string[]>();
  const exclusions: AgentBrainExclusion[] = [];
  const rejections: AdoptionRejection[] = [];
  const packageSources: Record<string, string> = {};

  for (const entry of entries) {
    const classified = classifyEntry(entry);
    if (classified.classification === "portable-source") {
      const packageName = inferPackageName(entry.path);
      const id = `pkg.${packageName}`;
      const pkg: AgentBrainPackage = {
        id,
        kind: "skill",
        name: titleize(packageName),
        files: [`packages/${packageName}/SKILL.md`],
        provenance: {
          sourceKind: "home",
          sourcePath: entry.path,
          originalTarget: entry.path,
          adapter: entry.adapter ?? "claude-code",
          classification: "portable-source",
          confidence: classified.confidence
        }
      };

      if (!packages.has(id)) {
        packages.set(id, pkg);
        packageSources[pkg.files[0]!] = readPortableSourceContent(entry);
      }
      packagePaths.set(id, [...(packagePaths.get(id) ?? []), entry.path]);
      continue;
    }

    if (classified.classification === "secret") {
      rejections.push({
        path: entry.path,
        reason: "secret material requires explicit override"
      });
    }

    if (classified.classification !== "unknown") {
      exclusions.push({
        path: entry.path,
        classification: classified.classification,
        reason: classified.role
      });
    }
  }

  const conflicts = [...packagePaths.entries()]
    .filter(([, paths]) => new Set(paths).size > 1)
    .map(([packageId, paths]) => ({
      id: "package-name-conflict" as const,
      packageId,
      paths
    }));

  const packageIds = [...packages.keys()];
  return {
    packages: [...packages.values()],
    profile: {
      id: "profile.default",
      name: "Default",
      packages: packageIds,
      targets: buildTargets([...packages.values()])
    },
    exclusions,
    conflicts,
    rejections,
    packageSources
  };
}

function buildTargets(packages: AgentBrainPackage[]): Partial<Record<TargetAdapterName, { packageIds: string[] }>> {
  const targets: Partial<Record<TargetAdapterName, { packageIds: string[] }>> = {};
  for (const pkg of packages) {
    const adapter = pkg.provenance.adapter;
    targets[adapter] = {
      packageIds: [...(targets[adapter]?.packageIds ?? []), pkg.id]
    };
  }
  return targets;
}

function inferPackageName(candidatePath: string): string {
  const skillMatch = candidatePath.match(/\/skills\/(.+)\/SKILL\.md$/);
  if (skillMatch?.[1]) {
    const skillPath = skillMatch[1];
    const parts = skillPath.split("/");
    const name = parts.at(-1) ?? "package";
    const namespace = parts.slice(0, -1).map(slugify).filter(Boolean);
    return slugify([...namespace, name].join("-"));
  }

  return slugify(candidatePath.split("/").at(-1) ?? "package");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function titleize(value: string): string {
  return value
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
