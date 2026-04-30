import { detectImportSources } from "../import/source-detectors.js";
import type { ScannableFsPort } from "../core/fs-port.js";
import type { TargetAdapterName } from "../core/provenance.js";

export interface SetupDiscovery {
  visibleRoots: string[];
  sources: ReturnType<typeof detectImportSources>;
  symlinks: SetupSymlink[];
  adapterTargets: SetupAdapterTarget[];
}

export interface SetupSymlink {
  visiblePath: string;
  realPath?: string;
  linkTarget?: string;
  broken: boolean;
}

export interface SetupAdapterTarget {
  adapter: TargetAdapterName;
  visibleRoot: string;
  confidence: number;
}

export function createSetupDiscovery(fs: ScannableFsPort): SetupDiscovery {
  const visibleRoots = sortedUnique(fs.entries.map((entry) => visibleRootFor(entry.logicalPath ?? entry.path)));
  const symlinks = fs.entries
    .filter((entry) => entry.kind === "symlink")
    .map((entry) => ({
      visiblePath: entry.logicalPath ?? entry.path,
      realPath: entry.realPath,
      linkTarget: entry.linkTarget,
      broken: Boolean(entry.broken)
    }));

  return {
    visibleRoots,
    sources: detectImportSources(fs.entries),
    symlinks,
    adapterTargets: adapterTargetsFor(fs)
  };
}

function adapterTargetsFor(fs: ScannableFsPort): SetupAdapterTarget[] {
  const targets = new Map<string, SetupAdapterTarget>();

  for (const entry of fs.entries) {
    const adapters = entry.adapters ?? (entry.adapter ? [entry.adapter] : []);
    for (const adapter of adapters) {
      const visibleRoot = visibleRootFor(entry.logicalPath ?? entry.path);
      const confidence = visibleRoot === "~/.agents" ? 0.8 : 0.9;
      const key = `${adapter}:${visibleRoot}`;
      if (!targets.has(key)) {
        targets.set(key, {
          adapter,
          visibleRoot,
          confidence
        });
      }
    }
  }

  return [...targets.values()].sort((left, right) =>
    `${left.adapter}:${left.visibleRoot}`.localeCompare(`${right.adapter}:${right.visibleRoot}`)
  );
}

function visibleRootFor(candidatePath: string): string {
  for (const root of ["~/.agents", "~/.claude", "~/.codex"] as const) {
    if (candidatePath === root || candidatePath.startsWith(`${root}/`)) {
      return root;
    }
  }

  return candidatePath.split("/").slice(0, 2).join("/") || candidatePath;
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}
