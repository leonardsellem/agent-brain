import { scanLiveRoot } from "../core/live-fs-port.js";
import type { ScannableEntry, ScannableFsPort } from "../core/fs-port.js";
import type { TargetAdapterName } from "../core/provenance.js";

export interface LiveScanInputs {
  claudeRoots?: string[];
  codexRoots?: string[];
  sourceRoots?: string[];
}

export function createLiveScannableFsPort(inputs: LiveScanInputs): ScannableFsPort {
  const scannedRoots = [
    ...(inputs.claudeRoots ?? []).map((root) => scanLiveRoot({ root, adapter: "claude-code" })),
    ...(inputs.codexRoots ?? []).map((root) => scanLiveRoot({ root, adapter: "codex" })),
    ...(inputs.sourceRoots ?? []).map((root) => scanLiveRoot({ root }))
  ];

  return {
    root: "live",
    entries: scannedRoots.flatMap((scanned) => scanned.entries).map(withInferredAdapter)
  };
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
