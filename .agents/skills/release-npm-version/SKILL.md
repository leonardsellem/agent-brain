---
name: release-npm-version
description: Release a new Agent Brain npm version. Use when the user asks to release or publish a new npm version, cut a major or minor release, prepare a version bump, create a release PR, or publish @leonardsellem/agent-brain. This skill prompts for major/minor when not specified, performs Changesets version preparation, runs release verification, commits and pushes a release-prep branch, opens or reuses a PR, synchronizes dev after merge, creates the GitHub Release publish trigger, waits for the publish workflow, and confirms the package is live on npm. It never runs npm publish locally and never adds npm tokens.
---

# Release npm Version

Use this repository-scoped workflow to release `@leonardsellem/agent-brain` to npm end to end.

## Safety Boundary

Never bypass the repository publish workflow:

- Do not run `npm publish`.
- Do not add npm tokens. The repo uses Trusted Publishing/OIDC.
- Do not force-push protected branches.
- Do not publish from an unmerged release-prep branch.
- Do not skip verification failures or call them pre-existing.

This skill is expected to publish by creating the dedicated GitHub Release or version tag trigger after the release-prep changes are merged into `main`. Only stop before publication for a real blocker, such as failed verification, branch divergence that cannot fast-forward, missing npm Trusted Publishing configuration, a failed publish workflow that cannot be fixed in-session, or an already-published target version.

## Workflow

1. **Load context**
   - Read `AGENTS.md`, `docs/npm-release.md`, `package.json`, `.changeset/config.json`, and `.github/workflows/npm-publish.yml`.
   - Run `brv status`, one broad `brv query` about npm release distribution, and one narrow `brv query` about release workflow/package files.
   - Use GBrain for project-history lookup if available.

2. **Choose release type**
   - If the user specified an exact major/minor target such as `0.2`, normalize it to `0.2.0`.
   - If the user specified `major` or `minor`, compute the next version from `package.json`.
   - If the user did not specify a target, ask exactly one blocking question: "Is this a major or minor release?"
   - Do not offer patch unless the user explicitly asks to change the skill's scope.

3. **Preflight**
   - Confirm package name is `@leonardsellem/agent-brain` and the CLI bin is `agent-brain`.
   - Confirm `git status --short` is clean before starting. If not clean, ask whether to stop or continue on the dirty branch.
   - Fetch origin and inspect `origin/dev` and `origin/main`.
   - Prefer preparing release changes from `dev`, then opening the release PR to `main`.
   - If the release branch must start from `main` instead, say why in the handoff and keep the PR target as `main`.
   - If `dev` is behind `main`, pause and sync it first with a fast-forward-only update before preparing the release:

     ```bash
     git fetch origin
     git switch dev
     git merge --ff-only origin/main
     git push origin dev
     ```

     If fast-forward is impossible, stop and ask whether to resolve the branch divergence with a normal PR or merge workflow. Do not force-push `dev`.
   - If currently on another branch, ask before using it as the release base.
   - Run the bundled helper in dry-run mode to compute the next version when preparing a fresh major/minor bump:

     ```bash
     node .agents/skills/release-npm-version/scripts/prepare_release_changeset.mjs <major|minor>
     ```

   - If `package.json` already equals the requested target version and that commit is already on `main`, treat the release as already prepared and continue with post-merge synchronization and publication.
   - Check npm for an existing version:

     ```bash
     npm view @leonardsellem/agent-brain@<nextVersion> version
     ```

     Existing version means stop; absence is expected for a new release.

4. **Create release-prep branch**
   - Create a branch named `codex/release-v<nextVersion>` from the approved release base.
   - If the branch already exists, inspect it before reusing it.

5. **Prepare version files**
   - Create the Changesets entry with the helper:

     ```bash
     node .agents/skills/release-npm-version/scripts/prepare_release_changeset.mjs <major|minor> --write
     ```

   - Run:

     ```bash
     npm run version-packages
     npm install --package-lock-only --ignore-scripts
     ```

   - Inspect the diff. Expected release-prep outputs are `package.json`, `package-lock.json`, `CHANGELOG.md`, and removal/consumption of the temporary changeset.

6. **Verify**
   - Run:

     ```bash
     npm test
     npm run typecheck
     npm run build
     npm run pack:smoke
     npm audit --audit-level=moderate
     npm test -- tests/integration/release-cli.test.ts
     node dist/cli.js --help
     git diff --check
     ```

   - Fix failures. Do not call failures pre-existing.

7. **Commit, push, and PR**
   - Commit with `chore(release): prepare v<nextVersion>`.
   - Push the release branch.
   - Open a PR to `main` unless the user explicitly chose another base.
   - PR body must include summary, verification results, the planned publish trigger, the post-merge `dev` sync requirement, and this warning:

     `Publishing is automatic once this PR is merged and the release skill creates the GitHub Release or version tag. Do not merge until v<nextVersion> is ready to go live on npm.`
   - If branch protection or required review prevents merging, stop and report that blocker. Otherwise merge the release PR with the repository's normal merge strategy.

8. **Sync after merge**
   - Fetch the merge result.
   - Fast-forward `dev` from `main` and push it:

     ```bash
     git fetch origin
     git switch dev
     git merge --ff-only origin/main
     git push origin dev
     ```

     If `dev` cannot fast-forward, stop and resolve the divergence by PR/merge before publishing. Do not force-push `dev`.

9. **Publish the merged release**
   - Confirm `main`, `dev`, and the local release base all point at the intended merged release commit.
   - Confirm npm still does not have the target version:

     ```bash
     npm view @leonardsellem/agent-brain@<nextVersion> version
     ```

   - Create a GitHub Release for the merged commit. Prefer a GitHub Release over a raw tag because it leaves human-readable release evidence:

     ```bash
     gh release create v<nextVersion> --target <mainCommit> --title "v<nextVersion>" --notes-file <releaseNotesFile>
     ```

     If a GitHub Release cannot be created but an explicit version tag is acceptable and safe, use the tag workflow instead:

     ```bash
     git tag v<nextVersion> <mainCommit>
     git push origin v<nextVersion>
     ```

   - Wait for the publish workflow:

     ```bash
     gh run list --workflow npm-publish.yml --limit 5
     gh run watch <runId> --exit-status
     ```

   - Confirm npm is live:

     ```bash
     npm view @leonardsellem/agent-brain@<nextVersion> version
     npm view @leonardsellem/agent-brain version
     ```

10. **Handoff**
   - Tell the user the published version, release tag or GitHub Release URL, publish workflow URL, npm package URL, branch sync status, commit, and verification results.
   - If publication did not complete, state the real blocker and the exact command or UI step needed to unblock it.
   - Record durable knowledge with GBrain/ByteRover when meaningful.

## Helper Script

Use `scripts/prepare_release_changeset.mjs` for deterministic version math and Changesets file creation. It validates the package name, computes the next major or minor version from `package.json`, and refuses to overwrite an existing changeset file.
