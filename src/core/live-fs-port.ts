import {
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync
} from "node:fs";
import path from "node:path";
import type { ScannableEntry, ScannableFsPort } from "./fs-port.js";
import type { TargetAdapterName } from "./provenance.js";

export interface ScanLiveRootOptions {
  root: string;
  adapter?: TargetAdapterName;
  adapters?: TargetAdapterName[];
  contentSampleBytes?: number;
}

export function scanLiveRoot(options: ScanLiveRootOptions): ScannableFsPort {
  const root = path.resolve(options.root);
  const entries: ScannableEntry[] = [];

  try {
    const rootStat = lstatSync(root);
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

  scanDirectoryChildren(root, options, entries);

  return {
    root,
    entries
  };
}

function scanDirectoryChildren(
  directory: string,
  options: ScanLiveRootOptions,
  entries: ScannableEntry[]
) {
  let children: string[];
  try {
    children = readdirSync(directory).sort();
  } catch (error) {
    entries.push(unreadableEntry(directory, options, error));
    return;
  }

  for (const child of children) {
    const childPath = path.join(directory, child);
    const entry = scanPath(childPath, options);
    entries.push(entry);

    if (entry.kind === "directory") {
      scanDirectoryChildren(childPath, options, entries);
    }
  }
}

function scanPath(entryPath: string, options: ScanLiveRootOptions): ScannableEntry {
  try {
    const stat = lstatSync(entryPath);
    const ownership = ownershipFields(options);

    if (stat.isSymbolicLink()) {
      const linkTarget = readlinkSync(entryPath);
      try {
        return omitUndefined({
          path: entryPath,
          kind: "symlink" as const,
          ...ownership,
          linkTarget,
          realPath: realpathSync(entryPath)
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
        contentSample: readContentSample(entryPath, options.contentSampleBytes)
      });
    }

    return unreadableEntry(entryPath, options, new Error("Unsupported filesystem entry"));
  } catch (error) {
    return unreadableEntry(entryPath, options, error);
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

function readContentSample(entryPath: string, contentSampleBytes = 4096): string | undefined {
  try {
    return readFileSync(entryPath, "utf8").slice(0, contentSampleBytes);
  } catch {
    return undefined;
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
