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
    for (const candidatePath of [entry.path, entry.realPath]) {
      if (!candidatePath) {
        continue;
      }

      const source = detectSource(candidatePath, entry);
      if (!source) {
        continue;
      }
      sources.set(`${source.kind}:${source.root}`, source);
    }
  }

  return [...sources.values()];
}

function detectSource(candidatePath: string, entry: ScannableEntry): ImportSource | undefined {
  if (candidatePath.includes("/.dotstate/") || candidatePath.endsWith("/.dotstate/config.yaml")) {
    return { kind: "dotstate", root: rootBefore(candidatePath, ".dotstate"), confidence: 0.95 };
  }

  if (candidatePath.includes("/dotstate/storage/") || candidatePath.endsWith("/dotstate/config.yaml")) {
    return { kind: "dotstate", root: rootBefore(candidatePath, "dotstate"), confidence: 0.95 };
  }

  if (candidatePath.includes("/chezmoi/")) {
    return { kind: "chezmoi", root: rootBefore(candidatePath, "chezmoi"), confidence: 0.9 };
  }

  if (candidatePath.includes("/.stow/")) {
    return { kind: "stow", root: rootThrough(candidatePath, ".stow"), confidence: 0.85 };
  }

  if (entry.gitBare) {
    return { kind: "bare-git", root: path.posix.dirname(candidatePath), confidence: 0.85 };
  }

  const homeRoot = detectHomeRoot(candidatePath);
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
