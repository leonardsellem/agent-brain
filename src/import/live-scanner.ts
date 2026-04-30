import { scanLiveRoot } from "../core/live-fs-port.js";
import { toDisplayPath } from "../core/display-path.js";
import os from "node:os";
import path from "node:path";
import type { ScannableEntry, ScannableFsPort } from "../core/fs-port.js";
import type { TargetAdapterName } from "../core/provenance.js";

export interface LiveScanInputs {
  claudeRoots?: string[];
  codexRoots?: string[];
  sourceRoots?: string[];
  maxEntries?: number;
}

export function createLiveScannableFsPort(inputs: LiveScanInputs): ScannableFsPort {
  const scannedRoots = [
    ...(inputs.claudeRoots ?? []).map((root) =>
      withLogicalRoot(scanLiveRoot({ root, adapter: "claude-code", maxEntries: inputs.maxEntries }), "~/.claude")
    ),
    ...(inputs.codexRoots ?? []).map((root) =>
      withLogicalRoot(scanLiveRoot({ root, adapter: "codex", maxEntries: inputs.maxEntries }), "~/.codex")
    ),
    ...(inputs.sourceRoots ?? []).map((root) => scanLiveRoot({ root, maxEntries: inputs.maxEntries }))
  ];

  return {
    root: "live",
    entries: scannedRoots.flatMap((scanned) => scanned.entries).map(withInferredAdapter)
  };
}

export function createDefaultDiagnosisScannableFsPort(): ScannableFsPort {
  const home = os.homedir();
  const scanned = createLiveScannableFsPort({
    claudeRoots: [path.join(home, ".claude")],
    codexRoots: [path.join(home, ".codex")],
    maxEntries: 5_000
  });
  return {
    ...scanned,
    entries: scanned.entries.map((entry) => ({
      ...entry,
      path: toDisplayPath(entry.path),
      realPath: entry.realPath ? toDisplayPath(entry.realPath) : undefined
    }))
  };
}

function withLogicalRoot(fs: ScannableFsPort, logicalRoot: string): ScannableFsPort {
  return {
    root: fs.root,
    entries: fs.entries.map((entry) => ({
      ...entry,
      logicalPath: logicalPathForEntry(fs.root, entry.path, logicalRoot)
    }))
  };
}

function logicalPathForEntry(root: string, entryPath: string, logicalRoot: string): string {
  const relative = path.relative(root, entryPath).split(path.sep).join("/");
  return relative ? `${logicalRoot}/${relative}` : logicalRoot;
}

function withInferredAdapter(entry: ScannableEntry): ScannableEntry {
  if (entry.adapter || entry.adapters) {
    return entry;
  }

  const adapter = inferAdapter(entry.path);
  return adapter ? { ...entry, adapter } : entry;
}

function inferAdapter(candidatePath: string): TargetAdapterName | undefined {
  if (candidatePath.includes("/.claude/")) {
    return "claude-code";
  }
  if (candidatePath.includes("/.codex/")) {
    return "codex";
  }
  return undefined;
}
