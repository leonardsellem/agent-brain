import { scanLiveRoot } from "../core/live-fs-port.js";
import { toDisplayPath } from "../core/display-path.js";
import os from "node:os";
import path from "node:path";
import type { ScannableEntry, ScannableFsPort } from "../core/fs-port.js";
import type { TargetAdapterName } from "../core/provenance.js";

export interface LiveScanInputs {
  claudeRoots?: string[];
  codexRoots?: string[];
  agentsRoots?: string[];
  sourceRoots?: string[];
  maxEntries?: number;
  contentSampleBytes?: number;
}

export function createLiveScannableFsPort(inputs: LiveScanInputs): ScannableFsPort {
  const scannedRoots = [
    ...(inputs.claudeRoots ?? []).map((root) =>
      withLogicalRoot(scanLiveRoot(liveScanOptions({ root, adapter: "claude-code", inputs })), "~/.claude")
    ),
    ...(inputs.codexRoots ?? []).map((root) =>
      withLogicalRoot(scanLiveRoot(liveScanOptions({ root, adapter: "codex", inputs })), "~/.codex")
    ),
    ...(inputs.agentsRoots ?? []).map((root) =>
      withLogicalRoot(scanLiveRoot(liveScanOptions({ root, adapter: "codex", inputs })), "~/.agents")
    ),
    ...(inputs.sourceRoots ?? []).map((root) => scanLiveRoot(liveScanOptions({ root, inputs })))
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
    agentsRoots: [path.join(home, ".agents")],
    maxEntries: 5_000
  });
  return {
    ...scanned,
    entries: scanned.entries.map((entry) => ({
      ...entry,
      path: toDisplayPath(entry.path),
      realPath: entry.realPath ? toDisplayPath(entry.realPath) : undefined,
      linkTarget: entry.linkTarget ? toDisplayPath(entry.linkTarget) : undefined,
      error: entry.error ? toDisplayPath(entry.error) : undefined
    }))
  };
}

export function createDefaultSetupScannableFsPort(options: { fullContent?: boolean } = {}): ScannableFsPort {
  const home = os.homedir();
  const scanned = createLiveScannableFsPort({
    claudeRoots: [path.join(home, ".claude")],
    codexRoots: [path.join(home, ".codex")],
    agentsRoots: [path.join(home, ".agents")],
    maxEntries: 5_000,
    contentSampleBytes: options.fullContent ? Number.MAX_SAFE_INTEGER : undefined
  });
  return {
    ...scanned,
    entries: scanned.entries.map((entry) => ({
      ...entry,
      path: toDisplayPath(entry.path),
      realPath: entry.realPath ? toDisplayPath(entry.realPath) : undefined,
      linkTarget: entry.linkTarget ? toDisplayPath(entry.linkTarget) : undefined,
      error: entry.error ? toDisplayPath(entry.error) : undefined
    }))
  };
}

function liveScanOptions(input: {
  root: string;
  adapter?: TargetAdapterName;
  inputs: LiveScanInputs;
}): Parameters<typeof scanLiveRoot>[0] {
  return {
    root: input.root,
    adapter: input.adapter,
    maxEntries: input.inputs.maxEntries,
    contentSampleBytes: input.inputs.contentSampleBytes
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
