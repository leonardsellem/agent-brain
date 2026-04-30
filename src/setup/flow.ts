import { createAdoptionPlan } from "../import/adoption-plan.js";
import { writeBrainRepo } from "../import/brain-writer.js";
import { writeRepoFiles } from "../core/repo-writer.js";
import type { ScannableEntry } from "../core/fs-port.js";

export type SetupImportPlan = ReturnType<typeof createAdoptionPlan>;

export interface SetupImportWrite {
  writtenPaths: string[];
}

export function createSetupImportPlan(entries: ScannableEntry[]): SetupImportPlan {
  return createAdoptionPlan(entries);
}

export function writeSetupImport(plan: SetupImportPlan, repoDestination: string): SetupImportWrite {
  const write = writeBrainRepo(plan);
  const repoWrite = writeRepoFiles(
    repoDestination,
    Object.fromEntries(write.writtenPaths.map((writtenPath) => [writtenPath, write.files[writtenPath]!]))
  );

  return {
    writtenPaths: repoWrite.writtenPaths
  };
}
