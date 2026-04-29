import { claudeCodeAdapter } from "../adapters/claude-code.js";
import { codexAdapter } from "../adapters/codex.js";
import { detectSharedRootRisk } from "../adapters/index.js";
import type { Finding } from "../types.js";
import type { ScannableEntry } from "./fs-port.js";
import type { OwnershipClassification } from "./provenance.js";

export interface ClassifiedEntry {
  path: string;
  classification: OwnershipClassification;
  role: string;
  confidence: number;
  recommendation?: string;
  findings: Finding[];
}

const secretPattern = /(api[_-]?key|secret|token|password)\s*[:=]\s*['"]?(sk-|gho_|xox|[A-Za-z0-9_-]{12,})/i;

export function classifyEntry(entry: ScannableEntry): ClassifiedEntry {
  if (entry.kind === "unreadable") {
    return withFinding(entry, "unknown", "unreadable", 0.1, {
      id: "unreadable-path",
      severity: "medium",
      category: "unknown",
      path: entry.path,
      message: `Path could not be read${entry.error ? `: ${entry.error}` : ""}`
    });
  }

  if (entry.kind === "symlink" && entry.broken) {
    return withFinding(entry, "unknown", "broken-symlink", 0.1, {
      id: "broken-symlink",
      severity: "medium",
      category: "unknown",
      path: entry.path,
      message: `Broken symlink target ${entry.linkTarget ?? "(unknown)"}`,
      recommendation: "Inspect and classify before import or apply"
    });
  }

  const adapters = entry.adapters ?? (entry.adapter ? [entry.adapter] : []);
  if (adapters.length > 1 && entry.realPath) {
    const findings = detectSharedRootRisk(
      adapters.map((adapter) => ({
        adapter,
        path: entry.path,
        realPath: entry.realPath!
      }))
    );

    if (findings.length > 0) {
      return {
        path: entry.path,
        classification: "unknown",
        role: "shared-root-risk",
        confidence: 0.95,
        recommendation: findings[0]?.recommendation,
        findings
      };
    }
  }

  if (entry.contentSample && secretPattern.test(entry.contentSample)) {
    return {
      path: entry.path,
      classification: "secret",
      role: "secret-like-content",
      confidence: 0.95,
      recommendation: "Exclude until a user explicitly classifies safe portable source",
      findings: [
        {
          id: "secret-like-content",
          severity: "high",
          category: "secret",
          path: entry.path,
          message: "Secret-like content found in otherwise portable-looking path",
          recommendation: "Exclude until a user explicitly classifies safe portable source"
        }
      ]
    };
  }

  const adapterResult =
    entry.adapter === "claude-code"
      ? claudeCodeAdapter.classifyPath(entry.path)
      : entry.adapter === "codex"
        ? codexAdapter.classifyPath(entry.path)
        : {
            classification: "unknown" as const,
            role: "unknown",
            confidence: 0.2
          };

  return {
    path: entry.path,
    classification: adapterResult.classification,
    role: adapterResult.role,
    confidence: adapterResult.confidence,
    findings: []
  };
}

function withFinding(
  entry: ScannableEntry,
  classification: OwnershipClassification,
  role: string,
  confidence: number,
  finding: Finding
): ClassifiedEntry {
  return {
    path: entry.path,
    classification,
    role,
    confidence,
    findings: [finding]
  };
}
