import { scanLiveRoot } from "../core/live-fs-port.js";
import type { ScannableFsPort } from "../core/fs-port.js";

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
    entries: scannedRoots.flatMap((scanned) => scanned.entries)
  };
}
