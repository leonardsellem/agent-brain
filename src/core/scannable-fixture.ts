import { readFileSync } from "node:fs";
import type { ScannableEntry, ScannableFsPort, FsEntryKind } from "./fs-port.js";
import type { TargetAdapterName } from "./provenance.js";

const entryKinds = new Set<FsEntryKind>(["file", "directory", "symlink", "unreadable"]);
const adapterNames = new Set<TargetAdapterName>(["claude-code", "codex"]);

export class ScannableFixtureError extends Error {
  readonly code = "invalid_fixture";
}

export function loadScannableFixture(fixturePath: string): ScannableFsPort {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(fixturePath, "utf8"));
  } catch (error) {
    throw new ScannableFixtureError(error instanceof Error ? error.message : "could not read fixture");
  }

  if (!isRecord(parsed)) {
    throw new ScannableFixtureError("fixture must be a JSON object");
  }

  if (typeof parsed.root !== "string" || parsed.root.length === 0) {
    throw new ScannableFixtureError("root is required");
  }

  if (!Array.isArray(parsed.entries)) {
    throw new ScannableFixtureError("entries must be an array");
  }

  return {
    root: parsed.root,
    entries: parsed.entries.map((entry, index) => parseEntry(entry, index))
  };
}

function parseEntry(value: unknown, index: number): ScannableEntry {
  if (!isRecord(value)) {
    throw new ScannableFixtureError(`entries[${index}] must be an object`);
  }

  if (typeof value.path !== "string" || value.path.length === 0) {
    throw new ScannableFixtureError(`entries[${index}].path is required`);
  }

  if (typeof value.kind !== "string" || !entryKinds.has(value.kind as FsEntryKind)) {
    throw new ScannableFixtureError(`entries[${index}].kind is unsupported`);
  }

  const adapter = parseOptionalAdapter(value.adapter, `entries[${index}].adapter`);
  const adapters = parseOptionalAdapters(value.adapters, `entries[${index}].adapters`);
  if (!adapter && !adapters) {
    throw new ScannableFixtureError(`entries[${index}].adapter or entries[${index}].adapters is required`);
  }

  return omitUndefined({
    path: value.path,
    kind: value.kind as FsEntryKind,
    adapter,
    adapters,
    realPath: optionalString(value.realPath, `entries[${index}].realPath`),
    linkTarget: optionalString(value.linkTarget, `entries[${index}].linkTarget`),
    broken: optionalBoolean(value.broken, `entries[${index}].broken`),
    contentSample: optionalString(value.contentSample, `entries[${index}].contentSample`),
    error: optionalString(value.error, `entries[${index}].error`),
    gitBare: optionalBoolean(value.gitBare, `entries[${index}].gitBare`)
  });
}

function parseOptionalAdapter(value: unknown, label: string): TargetAdapterName | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !adapterNames.has(value as TargetAdapterName)) {
    throw new ScannableFixtureError(`${label} is unsupported`);
  }
  return value as TargetAdapterName;
}

function parseOptionalAdapters(value: unknown, label: string): TargetAdapterName[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new ScannableFixtureError(`${label} must be a non-empty array`);
  }
  return value.map((adapter, index) => parseOptionalAdapter(adapter, `${label}[${index}]`)!);
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new ScannableFixtureError(`${label} must be a string`);
  }
  return value;
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new ScannableFixtureError(`${label} must be a boolean`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
}
