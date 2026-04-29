import path from "node:path";
import type { ScannableEntry } from "../core/fs-port.js";
import type { SourceKind } from "../core/provenance.js";

export interface ImportSource {
  kind: SourceKind;
  root: string;
  confidence: number;
}

export function detectImportSources(entries: ScannableEntry[]): ImportSource[] {
  const sources = new Map<string, ImportSource>();

  for (const entry of entries) {
    const source = detectSource(entry);
    if (!source) {
      continue;
    }
    sources.set(`${source.kind}:${source.root}`, source);
  }

  return [...sources.values()];
}

function detectSource(entry: ScannableEntry): ImportSource | undefined {
  if (entry.path.includes("/.dotstate/") || entry.path.endsWith("/.dotstate/config.yaml")) {
    return { kind: "dotstate", root: rootBefore(entry.path, ".dotstate"), confidence: 0.95 };
  }

  if (entry.path.includes("/chezmoi/")) {
    return { kind: "chezmoi", root: rootBefore(entry.path, "chezmoi"), confidence: 0.9 };
  }

  if (entry.path.includes("/.stow/")) {
    return { kind: "stow", root: rootThrough(entry.path, ".stow"), confidence: 0.85 };
  }

  if (entry.gitBare) {
    return { kind: "bare-git", root: path.posix.dirname(entry.path), confidence: 0.85 };
  }

  const homeRoot = detectHomeRoot(entry.path);
  if (homeRoot) {
    return { kind: "home", root: homeRoot, confidence: 0.7 };
  }

  return undefined;
}

function detectHomeRoot(candidatePath: string): string | undefined {
  for (const marker of ["/.claude", "/.codex", "/.agents"]) {
    const index = candidatePath.indexOf(marker);
    if (index >= 0) {
      return candidatePath.slice(0, index + marker.length);
    }
  }
  return undefined;
}

function rootBefore(candidatePath: string, segment: string): string {
  const index = candidatePath.indexOf(`/${segment}`);
  return index >= 0 ? candidatePath.slice(0, index + segment.length + 1) : candidatePath;
}

function rootThrough(candidatePath: string, segment: string): string {
  const index = candidatePath.indexOf(`/${segment}/`);
  if (index < 0) {
    return candidatePath;
  }

  const rest = candidatePath.slice(index + segment.length + 2);
  const packageName = rest.split("/")[0];
  return candidatePath.slice(0, index + segment.length + 2 + packageName.length);
}
