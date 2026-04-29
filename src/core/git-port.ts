export interface GitPort {
  currentBranch(): Promise<string>;
  status(): Promise<string[]>;
  trackedFiles(root: string): Promise<string[]>;
}
