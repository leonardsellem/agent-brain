import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");

const read = (repoRelativePath: string) => readFileSync(path.join(repoRoot, repoRelativePath), "utf8");

describe("release workflow guards", () => {
  it("configures Changesets for reviewed release PR preparation without publishing", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const workflow = read(".github/workflows/release-pr.yml");

    expect(packageJson.devDependencies).toHaveProperty("@changesets/cli");
    expect(packageJson.scripts?.changeset).toBe("changeset");
    expect(packageJson.scripts?.["version-packages"]).toBe("changeset version");
    expect(existsSync(path.join(repoRoot, ".changeset/config.json"))).toBe(true);
    expect(workflow).toContain("changesets/action");
    expect(workflow).toContain("version: npm run version-packages");
    expect(workflow).toContain("npm run pack:smoke");
    expect(workflow).not.toMatch(/npm publish|publish --provenance/);
  });

  it("gates npm publishing on deliberate release or tag events with trusted publishing permissions", () => {
    const workflow = read(".github/workflows/npm-publish.yml");

    expect(workflow).toContain("release:");
    expect(workflow).toContain("types: [published]");
    expect(workflow).toContain("tags:");
    expect(workflow).not.toContain("branches:");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("npm run pack:smoke");
    expect(workflow).toContain("npm audit --audit-level=moderate");
    expect(workflow).toContain("npm view @leonardsellem/agent-brain@${PACKAGE_VERSION} version");
    expect(workflow).toContain("npm publish --provenance");
  });

  it("keeps ordinary CI separate from npm publishing", () => {
    const workflow = read(".github/workflows/ci.yml");

    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("branches: [dev, main]");
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("npm run typecheck");
    expect(workflow).toContain("npm run build");
    expect(workflow).toContain("npm run pack:smoke");
    expect(workflow).toContain("npm audit --audit-level=moderate");
    expect(workflow).not.toMatch(/npm publish|publish --provenance/);
  });

  it("requires release skill to publish after merge while keeping dev synchronized with main", () => {
    const skill = read(".agents/skills/release-npm-version/SKILL.md");

    expect(skill).toContain("Fetch origin and inspect `origin/dev` and `origin/main`.");
    expect(skill).toContain("Fast-forward `dev` from `main` and push it:");
    expect(skill).toContain("git merge --ff-only origin/main");
    expect(skill).toContain("Do not force-push `dev`.");
    expect(skill).toContain("Publish the merged release");
    expect(skill).toContain("gh release create v<nextVersion>");
    expect(skill).toContain("Wait for the publish workflow");
    expect(skill).toContain("npm view @leonardsellem/agent-brain@<nextVersion> version");
    expect(skill).not.toContain("Do not run `git tag`, push `v*` tags, or otherwise create the tag that triggers publishing.");
    expect(skill).not.toContain("Do not publish npm until this PR is merged and the release tag or GitHub Release is intentionally created.");
  });
});
