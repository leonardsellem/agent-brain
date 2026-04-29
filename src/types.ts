export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  message: string;
  path?: string;
  recommendation?: string;
  provenance?: Record<string, unknown>;
}

export interface ErrorEnvelope {
  code: string;
  message: string;
}

export interface SuccessReport {
  ok: true;
  summary?: string;
  findings: Finding[];
}

export interface ErrorReport {
  ok: false;
  error: ErrorEnvelope;
  findings: Finding[];
}

export type Report = SuccessReport | ErrorReport;

export interface FsPort {
  root: string;
}

export interface CommandContext {
  fs: FsPort;
}

export type CommandHandler = (context: CommandContext, args: string[]) => Promise<Report> | Report;
