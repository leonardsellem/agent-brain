---
name: release-npm-version
description: Prepare an Agent Brain npm release version. Use when the user asks to release a new npm version, cut a major or minor release, prepare a version bump, create a release PR, or do the pre-publish work for @leonardsellem/agent-brain. This skill prompts for major/minor when not specified, performs Changesets version preparation, runs release verification, commits and pushes a release-prep branch, and opens a PR, but never runs npm publish, pushes a version tag, or publishes a GitHub Release.
---

# Release npm Version

Use this repository-scoped workflow to prepare `@leonardsellem/agent-brain` for a new npm release while stopping before actual npm publication.

## Safety Boundary

Never perform the publish trigger in this skill:

- Do not run `npm publish`.
- Do not run `git tag`, push `v*` tags, or otherwise create the tag that triggers publishing.
- Do not publish a GitHub Release.
- Do not add npm tokens. The repo uses Trusted Publishing/OIDC.

The handoff is a verified release-prep PR plus exact next steps for the human release action.

## Workflow

1. **Load context**
   - Read `AGENTS.md`, `docs/npm-release.md`, `package.json`, `.changeset/config.json`, and `.github/workflows/npm-publish.yml`.
   - Run `brv status`, one broad `brv query` about npm release distribution, and one narrow `brv query` about release workflow/package files.
   - Use GBrain for project-history lookup if available.

2. **Choose release type**
   - If the user did not specify `major` or `minor`, ask exactly one blocking question: "Is this a major or minor release?"
   - Do not offer patch unless the user explicitly asks to change the skill's scope.

3. **Preflight**
   - Confirm package name is `@leonardsellem/agent-brain` and the CLI bin is `agent-brain`.
   - Confirm `git status --short` is clean before starting. If not clean, ask whether to stop or continue on the dirty branch.
   - Fetch origin and inspect the current branch. Prefer starting from `dev`; if currently on another branch, ask before using it as the release base.
   - Run the bundled helper in dry-run mode to compute the next version:

     ```bash
     node .agents/skills/release-npm-version/scripts/prepare_release_changeset.mjs <major|minor>
     ```

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
   - PR body must include summary, verification results, the next publish action, and this warning:

     `Do not publish npm until this PR is merged and the release tag or GitHub Release is intentionally created.`

8. **Handoff**
   - Tell the user the prepared version, branch, commit, PR URL, and verification results.
   - State exactly what remains: configure/confirm npm Trusted Publisher if needed, merge the PR, then intentionally publish the GitHub Release or push the release tag.
   - Record durable knowledge with GBrain/ByteRover when meaningful.

## Helper Script

Use `scripts/prepare_release_changeset.mjs` for deterministic version math and Changesets file creation. It validates the package name, computes the next major or minor version from `package.json`, and refuses to overwrite an existing changeset file.
