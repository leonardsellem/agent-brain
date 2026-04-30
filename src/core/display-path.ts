import { realpathSync } from "node:fs";

export function toDisplayPath(candidatePath: string): string {
  const home = process.env.HOME;
  if (!home) {
    return candidatePath;
  }

  for (const homePath of homePathCandidates(home)) {
    if (candidatePath === homePath) {
      return "~";
    }

    if (candidatePath.startsWith(`${homePath}/`)) {
      return `~/${candidatePath.slice(homePath.length + 1)}`;
    }

    if (candidatePath.includes(`${homePath}/`)) {
      return candidatePath.split(`${homePath}/`).join("~/");
    }
  }

  return candidatePath;
}

function homePathCandidates(home: string): string[] {
  try {
    return [...new Set([realpathSync(home), home])];
  } catch {
    return [home];
  }
}
