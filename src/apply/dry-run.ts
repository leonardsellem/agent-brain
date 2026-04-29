import { createHash } from "node:crypto";

export interface VirtualTarget {
  files: Record<string, string>;
  symlinks: Record<string, string>;
}

export type ApplyOperation =
  | { type: "create"; path: string; content: string }
  | { type: "update"; path: string; content: string }
  | { type: "move"; path: string; to: string }
  | { type: "symlink"; path: string; to: string };

export interface DryRun {
  operations: ApplyOperation[];
  fingerprint: string;
}

export function createDryRun(_target: VirtualTarget, operations: ApplyOperation[]): DryRun {
  return {
    operations: operations.map((operation) => ({ ...operation })),
    fingerprint: fingerprint(operations)
  };
}

function fingerprint(operations: ApplyOperation[]): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(operations)).digest("hex")}`;
}
