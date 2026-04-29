import type { Finding, Report } from "../types.js";

export function renderTextReport(report: Report): string {
  if (!report.ok) {
    return `${report.error.message}\n`;
  }

  const lines = [report.summary ?? "No findings"];
  for (const finding of report.findings) {
    lines.push(formatFinding(finding));
  }

  return `${lines.join("\n")}\n`;
}

function formatFinding(finding: Finding): string {
  const parts = [
    `[${finding.severity}]`,
    finding.id,
    finding.path ? `(${finding.path})` : "",
    finding.message,
    finding.recommendation ? `Recommendation: ${finding.recommendation}` : ""
  ];

  return parts.filter(Boolean).join(" ");
}
