import type { TargetAdapterName } from "./provenance.js";

export type FsEntryKind = "file" | "directory" | "symlink" | "unreadable";

export interface ScannableEntry {
  path: string;
  logicalPath?: string;
  kind: FsEntryKind;
  adapter?: TargetAdapterName;
  adapters?: TargetAdapterName[];
  realPath?: string;
  linkTarget?: string;
  broken?: boolean;
  contentSample?: string;
  error?: string;
  gitBare?: boolean;
  scanStatus?: "skipped" | "truncated";
}

export interface ScannableFsPort {
  root: string;
  entries: ScannableEntry[];
}

export function isScannableFsPort(value: { root: string }): value is ScannableFsPort {
  return Array.isArray((value as ScannableFsPort).entries);
}
