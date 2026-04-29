import path from "node:path";

export function safeRelativePath(relativePath: string): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error(`Expected a relative path: ${relativePath}`);
  }

  if (relativePath.split(/[\\/]/).includes("..")) {
    throw new Error(`Refusing path traversal: ${relativePath}`);
  }

  return relativePath;
}

export function resolveContainedPath(root: string, candidatePath: string): string {
  const absoluteRoot = path.resolve(root);
  const destination = path.isAbsolute(candidatePath)
    ? path.resolve(candidatePath)
    : path.resolve(absoluteRoot, candidatePath);

  if (destination !== absoluteRoot && !destination.startsWith(`${absoluteRoot}${path.sep}`)) {
    throw new Error(`Refusing path outside approved root: ${candidatePath}`);
  }

  return destination;
}
