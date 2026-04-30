import { detectSharedRootRisk } from "../adapters/index.js";
import { classifyEntry } from "../core/classification.js";
import { isScannableFsPort } from "../core/fs-port.js";
import { detectImportSources } from "../import/source-detectors.js";
import type { ScannableEntry } from "../core/fs-port.js";
import type { CommandHandler, Finding } from "../types.js";

export function createDoctorCommand(): CommandHandler {
  return (context) => {
    if (!isScannableFsPort(context.fs)) {
      return {
        ok: true,
        summary: "0 paths scanned, 1 findings",
        findings: [
          {
            id: "doctor.no-roots",
            severity: "info",
            category: "unknown",
            message: "No scannable roots were supplied or discovered",
            recommendation: "Run agent-brain doctor, add --claude-root/--codex-root, or use --fixture for deterministic rehearsal"
          }
        ]
      };
    }

    const findings: Finding[] = [];
    findings.push(...scanFindings(context.fs.entries));

    const classified = context.fs.entries.map((entry) => classifyEntry(entry));
    for (const entry of classified) {
      findings.push(...entry.findings);
    }

    for (const source of detectImportSources(context.fs.entries)) {
      findings.push({
        id: "import-source",
        severity: "info",
        category: "source",
        path: source.root,
        message: `Detected ${source.kind} import source`,
        provenance: {
          sourceKind: source.kind,
          confidence: source.confidence
        }
      });
    }

    findings.push(
      ...detectSharedRootRisk(
        context.fs.entries
          .flatMap((entry) =>
            (entry.adapters ?? (entry.adapter ? [entry.adapter] : [])).map((adapter) => ({
              adapter,
              path: entry.path,
              realPath: entry.realPath
            }))
          )
          .filter((entry): entry is { adapter: NonNullable<typeof entry.adapter>; path: string; realPath: string } =>
            Boolean(entry.realPath)
          )
          .map((entry) => ({
            adapter: entry.adapter,
            path: entry.path,
            realPath: entry.realPath
          }))
      )
    );

    return {
      ok: true,
      summary: `${classified.length} paths scanned, ${findings.length} findings`,
      findings: dedupeFindings(findings)
    };
  };
}

function scanFindings(entries: ScannableEntry[]): Finding[] {
  return entries.flatMap((entry) => {
    if (entry.scanStatus === "skipped") {
      const finding: Finding = {
        id: "scan.skipped-directory",
        severity: "medium",
        category: "runtime-cache",
        path: entry.path,
        message: entry.error ?? "Skipped recursive scan of cache-like or generated directory",
        recommendation: "Inspect manually only if this directory is expected to contain portable source"
      };
      return [
        finding
      ];
    }

    if (entry.scanStatus === "truncated") {
      const finding: Finding = {
        id: "scan.truncated",
        severity: "high",
        category: "unknown",
        path: entry.path,
        message: entry.error ?? "Live scan stopped before all entries were read",
        recommendation: "Narrow the explicit root or increase the scan limit before trusting the diagnosis"
      };
      return [finding];
    }

    return [];
  });
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.id}:${finding.path ?? ""}:${finding.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
