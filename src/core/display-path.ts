export function toDisplayPath(candidatePath: string): string {
  const home = process.env.HOME;
  if (!home) {
    return candidatePath;
  }

  if (candidatePath === home) {
    return "~";
  }

  if (candidatePath.startsWith(`${home}/`)) {
    return `~/${candidatePath.slice(home.length + 1)}`;
  }

  return candidatePath;
}
