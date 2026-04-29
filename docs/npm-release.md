# npm Release

This runbook covers npm distribution for Agent Brain. The user-facing install path is documented in [README.md](../README.md); this file is for maintainers and agents preparing or publishing a package release.

## Scope

Agent Brain publishes as `@leonardsellem/agent-brain` and installs the `agent-brain` CLI command. The npm package distributes the CLI and public docs only; it does not publish local plans, brainstorm notes, test fixtures, runtime artifacts, private memory, or generated local state.

Publishing is deliberate. Ordinary `dev` or `main` merges must not publish to npm. Version preparation and npm publication are separate release steps.

## Version Preparation

Use Changesets for reviewed version and changelog preparation:

```bash
npm run changeset
```

Changesets entries are accumulated with feature work. The release PR workflow prepares version and changelog updates from `main` and runs verification before opening or updating the release PR. The release PR workflow must not publish to npm.

Before merging a release PR, confirm:

- The version bump matches the intended release.
- Changelog text is public-safe and does not mention private local paths.
- `npm test`, `npm run typecheck`, `npm run build`, `npm run pack:smoke`, and `npm audit --audit-level=moderate` pass.

## Publish Trigger

npm publication runs only from the dedicated publish workflow when a GitHub Release is published or an explicit version tag is pushed. The workflow checks whether the package version is already present on npm before publishing so repeated release/tag activity fails closed instead of overwriting an existing version.

The publish workflow must run these gates before `npm publish`:

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run pack:smoke`
- `npm audit --audit-level=moderate`
- package version already-published check

## Trusted Publishing Setup

The preferred publish path is npm Trusted Publishing through GitHub Actions OIDC. Before the first public publish, configure npmjs to trust this repository and the dedicated publish workflow file.

The publish workflow requests `id-token: write` and uses a publish-time Node/npm toolchain compatible with npm Trusted Publishing. The package runtime remains Node.js 20 or newer unless the CLI itself requires a runtime change.

Do not add long-lived npm publish tokens unless Trusted Publishing proves unavailable for this repository. If a token fallback becomes necessary, document why, limit the token scope, and keep it out of repository files.

## Release Evidence

Every successful publish should leave GitHub-visible evidence with:

- package name: `@leonardsellem/agent-brain`
- package version
- source ref and commit
- npm package URL
- verification status for tests, typecheck, build, pack smoke, and audit

Use this evidence when preparing public release notes or launch announcements.

## Safety Boundary

npm installation changes distribution, not Agent Brain's safety model. Installed users still need explicit roots, dry-run fingerprint confirmation, baseline snapshots, materialization locks, verification, rollback metadata, and bootstrap evidence for live target mutation.

Do not describe npm installation as a shortcut around diagnosis, apply review, verification, or rollback. Do not publish screenshots, logs, release notes, or npm package contents containing auth material, tokens, histories, private local paths, machine-local overrides, or copied live app-home state.
