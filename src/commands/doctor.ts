import { detectSharedRootRisk } from "../adapters/index.js";
import { classifyEntry } from "../core/classification.js";
import { isScannableFsPort } from "../core/fs-port.js";
import type { CommandHandler, Finding } from "../types.js";

export function createDoctorCommand(): CommandHandler {
  return (context) => {
    if (!isScannableFsPort(context.fs)) {
      return {
        ok: false,
        error: {
          code: "fixture_required",
          message: "doctor requires a scannable fixture in developer preview"
        },
        findings: [
          {
            id: "fixture-required",
            severity: "medium",
            category: "unknown",
            message: "No scannable fixture entries were supplied",
            recommendation: "Run agent-brain doctor --fixture tests/fixtures/e2e-persona/scannable.json"
          }
        ]
      };
    }

    const findings: Finding[] = [];
    const classified = context.fs.entries.map((entry) => classifyEntry(entry));
    for (const entry of classified) {
      findings.push(...entry.findings);
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
