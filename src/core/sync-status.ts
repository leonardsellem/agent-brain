import type { AgentBrainRepo, MaterializationLock } from "./model.js";

export interface SyncStatus {
  ok: boolean;
  missingGeneratedPackages: string[];
  staleGeneratedPackages: string[];
  summary: string;
}

export function getSyncStatus(repo: AgentBrainRepo, lock: MaterializationLock): SyncStatus {
  const packageIds = new Set(repo.packages.map((pkg) => pkg.id));
  const lockedPackageIds = new Set(lock.entries.map((entry) => entry.packageId));
  const missingGeneratedPackages = [...packageIds].filter((packageId) => !lockedPackageIds.has(packageId)).sort();
  const staleGeneratedPackages = [...lockedPackageIds].filter((packageId) => !packageIds.has(packageId)).sort();

  return {
    ok: missingGeneratedPackages.length === 0 && staleGeneratedPackages.length === 0,
    missingGeneratedPackages,
    staleGeneratedPackages,
    summary: `${missingGeneratedPackages.length} missing generated packages, ${staleGeneratedPackages.length} stale generated packages`
  };
}
