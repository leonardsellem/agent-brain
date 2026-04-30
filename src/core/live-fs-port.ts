import {
  closeSync,
  openSync,
  lstatSync,
  readSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  statSync
} from "node:fs";
import path from "node:path";
import type { ScannableEntry, ScannableFsPort } from "./fs-port.js";
import type { TargetAdapterName } from "./provenance.js";

export interface ScanLiveRootOptions {
  root: string;
  adapter?: TargetAdapterName;
  adapters?: TargetAdapterName[];
  contentSampleBytes?: number;
  maxEntries?: number;
  excludedDirectoryNames?: string[];
}

const defaultMaxEntries = 200_000;
const maxContentSampleBytes = 1024 * 1024;
const defaultExcludedDirectoryNames = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "__pycache__",
  ".cache",
  "cache",
  "caches",
  "logs",
  "tmp",
  ".tmp",
  "temp",
  "worktrees",
  "dist",
  "build",
  ".next"
]);

export function scanLiveRoot(options: ScanLiveRootOptions): ScannableFsPort {
  const root = path.resolve(options.root);
  const entries: ScannableEntry[] = [];
  const state = {
    truncated: false,
    maxEntries: options.maxEntries ?? defaultMaxEntries,
    excludedDirectoryNames: new Set(options.excludedDirectoryNames ?? defaultExcludedDirectoryNames),
    activeRealDirectories: new Set<string>()
  };

  try {
    const rootStat = lstatSync(root);
    if (rootStat.isSymbolicLink()) {
      const rootEntry = scanPath(root, options);
      entries.push(rootEntry);
      if (rootEntry.kind === "symlink" && !rootEntry.broken && isDirectoryFollowingSymlink(root)) {
        scanDirectoryChildren(root, options, entries, state);
      }
      return { root, entries };
    }

    if (!rootStat.isDirectory()) {
      entries.push(scanPath(root, options));
      return { root, entries };
    }
  } catch (error) {
    return {
      root,
      entries: [unreadableEntry(root, options, error)]
    };
  }

  scanDirectoryChildren(root, options, entries, state);

  return {
    root,
    entries
  };
}

function scanDirectoryChildren(
  directory: string,
  options: ScanLiveRootOptions,
  entries: ScannableEntry[],
  state: {
    truncated: boolean;
    maxEntries: number;
    excludedDirectoryNames: Set<string>;
    activeRealDirectories: Set<string>;
  }
) {
  if (state.truncated) {
    return;
  }

  let realDirectory: string | undefined;
  try {
    realDirectory = realpathSync(directory);
    if (state.activeRealDirectories.has(realDirectory)) {
      return;
    }
    state.activeRealDirectories.add(realDirectory);
  } catch {
    // The child-level scan below will surface the unreadable path.
  }

  let children: string[];
  try {
    children = readdirSync(directory).sort();
  } catch (error) {
    entries.push(unreadableEntry(directory, options, error));
    return;
  }

  for (const child of children) {
    if (state.truncated) {
      return;
    }

    const childPath = path.join(directory, child);
    const shouldSkip = shouldSkipDirectory(child, state.excludedDirectoryNames);
    const entry = shouldSkip ? markSkipped(scanPath(childPath, options)) : scanPath(childPath, options);
    entries.push(entry);

    if (entries.length >= state.maxEntries) {
      entries.push(truncatedEntry(directory, options, state.maxEntries));
      state.truncated = true;
      return;
    }

    if (entry.kind === "directory") {
      if (entry.scanStatus === "skipped") {
        continue;
      }
      scanDirectoryChildren(childPath, options, entries, state);
      continue;
    }

    if (entry.kind === "symlink" && !entry.broken && isDirectoryFollowingSymlink(childPath)) {
      scanDirectoryChildren(childPath, options, entries, state);
    }
  }

  if (realDirectory) {
    state.activeRealDirectories.delete(realDirectory);
  }
}

function shouldSkipDirectory(childName: string, excludedDirectoryNames: Set<string>): boolean {
  return excludedDirectoryNames.has(childName);
}

function markSkipped(entry: ScannableEntry): ScannableEntry {
  if (entry.kind !== "directory") {
    return entry;
  }

  return {
    ...entry,
    scanStatus: "skipped",
    error: "Skipped recursive scan of cache-like or generated directory"
  };
}

function scanPath(entryPath: string, options: ScanLiveRootOptions): ScannableEntry {
  try {
    const stat = lstatSync(entryPath);
    const ownership = ownershipFields(options);

    if (stat.isSymbolicLink()) {
      const linkTarget = readlinkSync(entryPath);
      try {
        const targetStat = statSync(entryPath);
        return omitUndefined({
          path: entryPath,
          kind: "symlink" as const,
          ...ownership,
          linkTarget,
          realPath: realpathSync(entryPath),
          contentSample: targetStat.isFile()
            ? readContentSample(entryPath, options.contentSampleBytes, targetStat.size)
            : undefined
        });
      } catch {
        return omitUndefined({
          path: entryPath,
          kind: "symlink" as const,
          ...ownership,
          linkTarget,
          broken: true
        });
      }
    }

    if (stat.isDirectory()) {
      return omitUndefined({
        path: entryPath,
        kind: "directory" as const,
        ...ownership,
        realPath: realpathSync(entryPath)
      });
    }

    if (stat.isFile()) {
      return omitUndefined({
        path: entryPath,
        kind: "file" as const,
        ...ownership,
        realPath: realpathSync(entryPath),
        contentSample: readContentSample(entryPath, options.contentSampleBytes, stat.size)
      });
    }

    return unreadableEntry(entryPath, options, new Error("Unsupported filesystem entry"));
  } catch (error) {
    return unreadableEntry(entryPath, options, error);
  }
}

function isDirectoryFollowingSymlink(entryPath: string): boolean {
  try {
    return statSync(entryPath).isDirectory();
  } catch {
    return false;
  }
}

function unreadableEntry(
  entryPath: string,
  options: ScanLiveRootOptions,
  error: unknown
): ScannableEntry {
  return omitUndefined({
    path: entryPath,
    kind: "unreadable" as const,
    ...ownershipFields(options),
    error: error instanceof Error ? error.message : String(error)
  });
}

function truncatedEntry(root: string, options: ScanLiveRootOptions, maxEntries: number): ScannableEntry {
  return omitUndefined({
    path: root,
    kind: "unreadable" as const,
    ...ownershipFields(options),
    scanStatus: "truncated" as const,
    error: `Stopped live scan after ${maxEntries} entries`
  });
}

function readContentSample(entryPath: string, contentSampleBytes = 4096, fileSize = contentSampleBytes): string | undefined {
  let fileDescriptor: number | undefined;
  try {
    fileDescriptor = openSync(entryPath, "r");
    const sampleBytes = Math.max(0, Math.min(contentSampleBytes, fileSize, maxContentSampleBytes));
    const buffer = Buffer.alloc(sampleBytes);
    const bytesRead = readSync(fileDescriptor, buffer, 0, sampleBytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } catch {
    return undefined;
  } finally {
    if (fileDescriptor !== undefined) {
      closeSync(fileDescriptor);
    }
  }
}

function ownershipFields(options: ScanLiveRootOptions) {
  return {
    adapter: options.adapter,
    adapters: options.adapters
  };
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
}
