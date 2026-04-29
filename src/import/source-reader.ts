import { readFileSync } from "node:fs";
import path from "node:path";
import type { ScannableEntry } from "../core/fs-port.js";

export function readPortableSourceContent(entry: ScannableEntry): string {
  if (entry.kind !== "file") {
    return "";
  }

  if (path.isAbsolute(entry.path)) {
    try {
      return readFileSync(entry.path, "utf8");
    } catch {
      // Fall back to fixture-provided content below.
    }
  }

  return entry.contentSample ?? "";
}
